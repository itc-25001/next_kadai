"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
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
          </div>
        )}

        <Link href="/records" className={styles.backLink}>
          一覧ページに戻る
        </Link>
      </div>
    </main>
  );
}
