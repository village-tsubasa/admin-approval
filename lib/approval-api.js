// ==========================================
// 承認 API
// - fetchPendingItems: 承認待ち一覧取得
// - detectDuplicates : 同 client × 同 date の approved 予定を検出
// - approveItems     : 承認 → Supabase update + GAS POST + 失敗フォールバック
// - rejectItems      : 却下 → Supabase update のみ（GAS POST しない）
// ==========================================

import { sb } from './supabase-client.js';
import { APPROVED_BY } from './config.js';
import { postToGasWithRetry } from './gas-poster.js';

const PENDING_SELECT_COLUMNS = [
  'id',
  'date',
  'client',
  'task',
  'haisha',
  'summary',
  'start_time',
  'end_time',
  'name',
  'beneficiary_number',
  'created_at',
  'approval_status'
].join(', ');

/**
 * approval_status='pending' の予定を申請日（created_at）昇順で取得する。
 * @returns {Promise<Array<object>>}
 */
export async function fetchPendingItems() {
  const { data, error } = await sb
    .from('schedule')
    .select(PENDING_SELECT_COLUMNS)
    .eq('approval_status', 'pending')
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data || [];
}

/**
 * 各 pending 申請に対し、同 client × 同 date の approved 予定（自分以外）を検出する。
 * @param {Array<object>} items pending 申請の配列
 * @returns {Promise<Map<string, Array<object>>>} pendingId → 重複候補配列
 */
export async function detectDuplicates(items) {
  const result = new Map();
  if (!items || items.length === 0) return result;

  // pending に登場する client / date を抽出
  const clients = [...new Set(items.map(it => it.client).filter(Boolean))];
  const dates = [...new Set(items.map(it => it.date).filter(Boolean))];
  if (clients.length === 0 || dates.length === 0) return result;

  const { data, error } = await sb
    .from('schedule')
    .select('id, client, date, start_time, end_time, task, haisha, summary')
    .eq('approval_status', 'approved')
    .in('client', clients)
    .in('date', dates);
  if (error) throw error;

  for (const it of items) {
    const matches = (data || []).filter(d =>
      d.client === it.client && d.date === it.date && d.id !== it.id
    );
    if (matches.length > 0) result.set(it.id, matches);
  }
  return result;
}

/**
 * 'HH:MM:SS' or 'HH:MM' → 'HH:MM'
 */
function fmtTime(t) {
  if (!t) return '';
  return String(t).slice(0, 5);
}

/**
 * 承認実行。
 *  1. schedule を approval_status='approved' に UPDATE（approved_at, approved_by も）
 *  2. 各レコードを GAS に POST（リトライ付き）
 *  3. GAS POST に最終失敗したものは synced_to_sheet=false を立てて Layer B に委譲
 *
 * @param {Array<string>} itemIds
 * @returns {Promise<{approved: number, gasFailed: number, gasFailedIds: Array<string>}>}
 */
export async function approveItems(itemIds) {
  if (!itemIds || itemIds.length === 0) return { approved: 0, gasFailed: 0, gasFailedIds: [] };

  const nowIso = new Date().toISOString();

  // 1. Supabase UPDATE
  const { data: updated, error } = await sb
    .from('schedule')
    .update({
      approval_status: 'approved',
      approved_at: nowIso,
      approved_by: APPROVED_BY
    })
    .in('id', itemIds)
    .select('id, date, client, task, haisha, summary, start_time, end_time, name, beneficiary_number');
  if (error) throw error;

  // 2. 各レコードを GAS に POST
  const gasFailedIds = [];
  for (const item of (updated || [])) {
    const payload = {
      action: 'add',
      supabaseId: item.id,
      date: item.date || '',
      helper: item.name || '',
      client: item.client || '',
      startTime: fmtTime(item.start_time),
      endTime: fmtTime(item.end_time),
      task: item.task || '',
      summary: item.summary || '',
      haisha: item.haisha || '',
      beneficiaryNumber: item.beneficiary_number || ''
    };
    const result = await postToGasWithRetry(payload);
    if (!result.ok) gasFailedIds.push(item.id);
  }

  // 3. GAS POST に最終失敗したレコードは synced_to_sheet=false にして Layer B に委譲
  //    （synced_to_sheet カラムがない場合はエラーをログのみで握りつぶす）
  if (gasFailedIds.length > 0) {
    try {
      const { error: syncErr } = await sb
        .from('schedule')
        .update({ synced_to_sheet: false })
        .in('id', gasFailedIds);
      if (syncErr) {
        console.warn('synced_to_sheet=false の更新に失敗（カラム未追加の可能性）:', syncErr);
      }
    } catch (ex) {
      console.warn('synced_to_sheet 更新で予期しない例外:', ex);
    }
  }

  return {
    approved: (updated || []).length,
    gasFailed: gasFailedIds.length,
    gasFailedIds
  };
}

/**
 * 却下実行。
 *  - schedule を approval_status='rejected' に UPDATE、rejected_reason をセット
 *  - GAS POST はしない（スプレッドシートには反映しない）
 *
 * @param {Array<string>} itemIds
 * @param {string} reason 任意の却下理由
 * @returns {Promise<{rejected: number}>}
 */
export async function rejectItems(itemIds, reason = '') {
  if (!itemIds || itemIds.length === 0) return { rejected: 0 };

  const { data, error } = await sb
    .from('schedule')
    .update({
      approval_status: 'rejected',
      rejected_reason: reason ? String(reason).trim() : null
    })
    .in('id', itemIds)
    .select('id');
  if (error) throw error;
  return { rejected: (data || []).length };
}
