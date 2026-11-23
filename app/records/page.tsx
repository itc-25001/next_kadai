"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabase";
import styles from "./page.module.css";

// 収支データの型定義
type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
};

export default function RecordsPage() {
  // 収支履歴を管理
  const [records, setRecords] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notSignedIn, setNotSignedIn] = useState(false);

  // Supabaseから登録済みの収支データを取得
  useEffect(() => {
    let active = true;

    async function fetchRecords() {
      // ログイン状態を確認
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      if (authError || !authData.user) {
        setNotSignedIn(true);
        setLoading(false);
        return;
      }

      // 日付の新しい順に収支記録を取得
      const { data, error: fetchError } = await supabase
        .from("transactions")
        .select("id, type, amount, description, date")
        .order("date", { ascending: false });

      if (!active) return;

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const loadedRecords: Transaction[] = (data ?? []).map((record) => ({
          id: record.id,
          type: record.type as Transaction["type"],
          amount: record.amount,
          description: record.description,
          date: record.date,
        }));

        setRecords(loadedRecords);
      }

      setLoading(false);
    }

    fetchRecords();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>収支一覧</h1>
          <Link href="/">トップページに戻る</Link>
        </header>

        <section className={styles.section}>
          <h2>登録した収支履歴</h2>

          {loading ? (
            <p>読み込み中...</p>
          ) : notSignedIn ? (
            <p>
              ログインが必要です。
              <Link href="/login">ログインする</Link>
            </p>
          ) : error ? (
            <p role="alert">取得エラー：{error}</p>
          ) : records.length === 0 ? (
            <p>登録された収支記録はありません。</p>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>日付</th>
                    <th>種別</th>
                    <th>内容</th>
                    <th>金額</th>
                    <th>操作</th>
                  </tr>
                </thead>

                <tbody>
                  {records.map((record) => (
                    <tr key={record.id}>
                      <td>{record.date}</td>

                      <td>{record.type === "income" ? "収入" : "支出"}</td>

                      <td>{record.description}</td>

                      <td
                        className={
                          record.type === "income"
                            ? styles.income
                            : styles.expense
                        }
                      >
                        {record.type === "income" ? "+" : "-"}
                        {record.amount.toLocaleString()}円
                      </td>
                      <td>
                        <Link
                          href={`/records/${record.id}`}
                          className={styles.detailLink}
                        >
                          詳細を見る
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
