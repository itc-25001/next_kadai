"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../lib/supabase";
import styles from "./page.module.css";

// 収支記録の型
type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
};

export default function RecordDetailPage() {
  // URLからidを取得
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const [record, setRecord] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notSignedIn, setNotSignedIn] = useState(false);

  // Supabaseから指定された記録を取得
  useEffect(() => {
    let active = true;

    async function fetchRecord() {
      setLoading(true);
      setError("");
      setRecord(null);
      setNotSignedIn(false);

      // ログイン状態を確認
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        setNotSignedIn(true);
        setLoading(false);
        return;
      }

      // IDが一致する収支記録を1件取得
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("id, type, amount, description, date")
        .eq("id", id)
        .maybeSingle();

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setRecord({
          id: data.id,
          type: data.type as Transaction["type"],
          amount: data.amount,
          description: data.description,
          date: data.date,
        });
      }

      setLoading(false);
    }

    fetchRecord();

    return () => {
      active = false;
    };
  }, [id]);

  async function handleDelete() {
    if (!record || deleting) return;

    // 削除前に確認する
    const confirmed = window.confirm("この収支記録を削除しますか？");

    if (!confirmed) return;

    setDeleting(true);
    setDeleteError("");

    try {
      // ログイン状態を確認
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setDeleteError("ログインが必要です。");
        return;
      }

      // Supabaseから対象の記録を削除
      const { data, error } = await supabase
        .from("transactions")
        .delete()
        .eq("id", record.id)
        .select("id");

      if (error) {
        setDeleteError(error.message);
        return;
      }

      if (!data || data.length === 0) {
        setDeleteError("削除対象が見つからないか、削除権限がありません。");
        return;
      }

      // 削除成功後、一覧ページへ移動
      router.replace("/records");
    } catch {
      setDeleteError("通信エラーが発生しました。");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1>収支の詳細</h1>

        {loading ? (
          <p>読み込み中...</p>
        ) : notSignedIn ? (
          <p>
            ログインが必要です。
            <Link href="/login">ログインする</Link>
          </p>
        ) : error ? (
          <p role="alert">取得エラー：{error}</p>
        ) : !record ? (
          <p>指定された収支記録が見つかりません。</p>
        ) : (
          <div className={styles.card}>
            <div className={styles.row}>
              <span>日付</span>
              <strong>{record.date}</strong>
            </div>

            <div className={styles.row}>
              <span>種別</span>
              <strong>{record.type === "income" ? "収入" : "支出"}</strong>
            </div>

            <div className={styles.row}>
              <span>内容</span>
              <strong>{record.description}</strong>
            </div>

            <div className={styles.row}>
              <span>金額</span>
              <strong
                className={
                  record.type === "income" ? styles.income : styles.expense
                }
              >
                {record.type === "income" ? "+" : "-"}
                {record.amount.toLocaleString()}円
              </strong>
            </div>
            <div className={styles.actions}>
              <Link href={`/records/${id}/edit`} className={styles.editButton}>
                編集する
              </Link>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className={styles.deleteButton}
              >
                {deleting ? "削除中..." : "削除する"}
              </button>

              {deleteError && (
                <p role="alert" className={styles.error}>
                  {deleteError}
                </p>
              )}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams(window.location.search);
            const month = params.get("month");

            router.push(
              month
                ? `/records?month=${encodeURIComponent(month)}`
                : "/records",
            );
          }}
          className={styles.backLink}
        >
          一覧ページに戻る
        </button>
      </div>
    </main>
  );
}
