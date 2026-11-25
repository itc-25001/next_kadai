"use client";

import { useState, useEffect, type FormEvent } from "react";
import styles from "./page.module.css";
import { supabase } from "../lib/supabase";
import Link from "next/link";
import { useRouter } from "next/navigation";

// 収支データの型定義
type Transaction = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  date: string;
};

export default function Home() {
  // 入力フォームの状態管理
  const router = useRouter();
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [records, setRecords] = useState<Transaction[]>([]);
  // ログイン状態を確認しているか
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    let active = true;

    // 他のタブなどでログアウトした場合も対応
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setRecords([]);
        setAuthLoading(true);
        router.replace("/login");
      }
    });

    async function fetchRecords() {
      // ログインしているか確認
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (!active) return;

      // 未ログインならログインページへ移動
      if (authError || !authData.user) {
        setRecords([]);
        router.replace("/login");
        return;
      }

      // ログイン中のユーザーの記録を取得
      const { data, error } = await supabase
        .from("transactions")
        .select("id, type, amount, description, date")
        .eq("user_id", authData.user.id)
        .order("date", { ascending: false });

      if (!active) return;

      if (error) {
        console.error("取得エラー:", error.message);
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

      // ログイン状態の確認完了
      setAuthLoading(false);
    }

    fetchRecords();

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  //：日付の状態管理
  const [date, setDate] = useState("");

  // 表示する月の状態管理

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");
    const currentMonth = `${year}-${month}`;

    // 保存した月があれば、その月を初期値にする
    if (typeof window !== "undefined") {
      const savedMonth = sessionStorage.getItem("selectedMonth");

      if (savedMonth && /^\d{4}-(0[1-9]|1[0-2])$/.test(savedMonth)) {
        return savedMonth;
      }
    }

    // 保存がなければ今月を表示する
    return currentMonth;
  });

  //：選択した月のデータを取得
  const monthlyRecords = records.filter(
    (record) => record.date.slice(0, 7) === selectedMonth,
  );
  //

  // 収入の合計
  const income = monthlyRecords
    .filter((record) => record.type === "income")
    .reduce((sum, record) => sum + record.amount, 0);

  // 支出の合計
  const expense = monthlyRecords
    .filter((record) => record.type === "expense")
    .reduce((sum, record) => sum + record.amount, 0);

  // 収支の差額
  const balance = income - expense;

  // 登録ボタンを押したときの処理
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = Number(amount);

    //：日付も含めた入力チェック
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      !description.trim() ||
      !date
    ) {
      alert("正しい金額・内容・日付を入力してください");
      return;
    }
    //
    // Supabaseに収支データを保存
    const { data, error } = await supabase
      .from("transactions")
      .insert({
        type: type,
        amount: value,
        description: description.trim(),
        date: date,
      })
      .select("id, type, amount, description, date")
      .single();

    if (error) {
      alert("保存に失敗しました：" + error.message);
      return;
    }

    // 保存に成功したデータを画面に追加
    setRecords((prev) => [...prev, data]);
    setAmount("");
    setDescription("");
  }

  // ログアウト処理
  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert("ログアウトに失敗しました：" + error.message);
      return;
    }

    // ログアウト後に収支データをクリア
    setRecords([]);

    // ログインページへ移動
    router.replace("/login");
  }

  // 認証確認中は収支登録画面を表示しない
  if (authLoading) {
    return (
      <main className={styles.loadingPage}>
        <div className={styles.loadingContent}>
          <div className={styles.spinner}></div>
          <p>ログイン状態を確認中...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <header className={styles.header}>
          <h1>収支管理アプリ</h1>
          <button
            type="button"
            onClick={handleLogout}
            className={styles.logoutButton}
          >
            ログアウト
          </button>

          <nav className={styles.historyLinks}>
            <Link href="/records">すべての収支履歴を見る</Link>

            <Link href={`/records?month=${selectedMonth}`}>
              表示する月の収支履歴を見る
            </Link>
          </nav>

          <p>毎月の収入と支出を管理できます</p>
        </header>

        {/* 月別収支 */}
        <section className={styles.section}>
          <h2>月別の収支</h2>

          <label className={styles.monthPicker}>
            表示する月：
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => {
                const month = e.target.value;

                setSelectedMonth(month);

                // 選択した月をブラウザに保存
                if (month) {
                  sessionStorage.setItem("selectedMonth", month);
                } else {
                  sessionStorage.removeItem("selectedMonth");
                }
              }}
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.currentTarget.showPicker()}
            />
          </label>

          <div className={styles.summaryGrid}>
            <div className={styles.card}>
              <span>収入合計</span>
              <strong className={styles.positive}>
                +{income.toLocaleString()}円
              </strong>
            </div>

            <div className={styles.card}>
              <span>支出合計</span>
              <strong className={styles.negative}>
                -{expense.toLocaleString()}円
              </strong>
            </div>

            <div className={styles.card}>
              <span>収支差額</span>
              <strong
                className={balance < 0 ? styles.negative : styles.positive}
              >
                {balance > 0 ? "+" : ""}
                {balance.toLocaleString()}円
              </strong>
            </div>
          </div>
        </section>

        {/* 収支登録フォーム */}
        <section className={styles.section}>
          <h2>収支を登録</h2>

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <label className={styles.field}>
                日付
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  // 入力欄をクリックするとカレンダーを表示
                  onClick={(e) => e.currentTarget.showPicker()}
                  required
                />
              </label>

              <label className={styles.field}>
                種別
                <select
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as "income" | "expense")
                  }
                >
                  <option value="income">収入</option>
                  <option value="expense">支出</option>
                </select>
              </label>

              <label className={styles.field}>
                金額
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                />
              </label>

              <label className={styles.field}>
                内容
                <input
                  type="text"
                  list="description-options"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="内容を選択または入力"
                  required
                />
                {/* 内容の選択候補 */}
                <datalist id="description-options">
                  <option value="食費" />
                  <option value="アルバイト代" />
                  <option value="家賃" />
                </datalist>
              </label>
            </div>

            <button type="submit" className={styles.submitButton}>
              登録する
            </button>
          </form>
        </section>

        {/* 登録履歴 */}
        <section className={styles.section}>
          <h2>登録履歴</h2>

          {monthlyRecords.length === 0 ? (
            <p className={styles.empty}>この月の記録はありません。</p>
          ) : (
            <ul className={styles.recordList}>
              {monthlyRecords.map((record) => (
                <li key={record.id} className={styles.recordItem}>
                  <div className={styles.recordInfo}>
                    <span className={styles.recordDate}>{record.date}</span>
                    <strong>{record.description}</strong>
                  </div>

                  <strong
                    className={
                      record.type === "income"
                        ? styles.positive
                        : styles.negative
                    }
                  >
                    {record.type === "income" ? "+" : "-"}
                    {record.amount.toLocaleString()}円
                  </strong>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
