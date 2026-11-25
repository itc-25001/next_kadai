"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
  return (
    <Suspense fallback={<p>読み込み中...</p>}>
      <RecordsContent />
    </Suspense>
  );
}

function RecordsContent() {
  // URLから選択された年月を取得
  const searchParams = useSearchParams();
  const selectedMonth = searchParams.get("month");
  // 収支履歴を管理
  const [records, setRecords] = useState<Transaction[]>([]);
  const [searchText, setSearchText] = useState("");
  // 現在表示しているページ番号
  const [currentPage, setCurrentPage] = useState(1);
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

  // 検索キーワードと選択月で絞り込む
  const filteredRecords = records.filter((record) => {
    const matchesSearch = record.description
      .toLowerCase()
      .includes(searchText.trim().toLowerCase());

    // 月が指定されていなければ全期間を対象にする
    const matchesMonth =
      !selectedMonth || record.date.slice(0, 7) === selectedMonth;

    return matchesSearch && matchesMonth;
  });

  // 1ページに表示する件数
  const itemsPerPage = 10;

  // 検索結果から総ページ数を計算
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  // 現在のページに表示する記録を抽出
  const startIndex = (currentPage - 1) * itemsPerPage;

  const paginatedRecords = filteredRecords.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>
            {selectedMonth
              ? `${selectedMonth.slice(0, 4)}年${Number(selectedMonth.slice(5))}月の収支一覧`
              : "すべての収支一覧"}
          </h1>
          <Link href="/">トップページに戻る</Link>
        </header>

        <section className={styles.section}>
          <h2>登録した収支履歴</h2>

          {/* 検索フォーム */}
          {!loading && !notSignedIn && !error && records.length > 0 && (
            <div className={styles.searchBox}>
              <label htmlFor="record-search">内容を検索</label>

              <input
                id="record-search"
                type="search"
                list="search-options"
                value={searchText}
                onChange={(e) => {
                  setSearchText(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="内容を選択または検索"
                className={styles.searchInput}
              />

              {/* 検索候補 */}
              <datalist id="search-options">
                <option value="食費" />
                <option value="アルバイト代" />
                <option value="家賃" />
                <option value="交通費" />
                <option value="買い物" />
              </datalist>

              <p>検索結果：{filteredRecords.length}件</p>
            </div>
          )}

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
          ) : filteredRecords.length === 0 ? (
            <p>検索条件に一致する記録はありません。</p>
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
                  {paginatedRecords.map((record) => (
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

              {/* ページ切り替え */}
              {totalPages > 1 && (
                <div className={styles.pagination}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    前へ
                  </button>

                  <span>
                    {currentPage} / {totalPages} ページ
                  </span>

                  <button
                    type="button"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
