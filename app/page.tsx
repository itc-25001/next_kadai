"use client";

import { useState, type FormEvent } from "react";
import styles from "./page.module.css";
import { supabase } from "../lib/supabase";

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
  const [type, setType] = useState<"income" | "expense">("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [records, setRecords] = useState<Transaction[]>([]);

  //：日付の状態管理
  const [date, setDate] = useState("");

  // 表示する月の状態管理
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, "0");

    return `${year}-${month}`;
  });
  //

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

    // 新しい収支データを作成
    const newRecord: Transaction = {
      id: crypto.randomUUID(),
      type: type,
      amount: value,
      description: description.trim(),

      //日付を保存
      date: date,
    };
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

    // 収支履歴に追加
    setRecords((prev) => [...prev, newRecord]);

    // 入力欄を初期化
    setAmount("");
    setDescription("");
  }

  return (
    <main className={styles.page}>
      <h1>収支管理アプリ</h1>

      {/*：月別の収支表示 */}
      <h2>月別の収支</h2>

      <label>
        表示する月：
        <input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </label>

      <p>収入：{income.toLocaleString()}円</p>
      <p>支出：{expense.toLocaleString()}円</p>
      <p>
        収支：{balance > 0 ? "+" : ""}
        {balance.toLocaleString()}円
      </p>
      <h2>収支を登録</h2>

      <form onSubmit={handleSubmit}>
        {/*：日付入力欄 */}
        <div>
          <label>
            日付：
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </label>
        </div>

        <div>
          <label>
            種別：
            <select
              value={type}
              onChange={(e) => setType(e.target.value as "income" | "expense")}
            >
              <option value="income">収入</option>
              <option value="expense">支出</option>
            </select>
          </label>
        </div>

        <div>
          <label>
            金額：
            <input
              type="number"
              min="1"
              step="1"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
        </div>

        <div>
          <label>
            内容：
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="例：食費、アルバイト代"
              required
            />
          </label>
        </div>

        <button type="submit">登録</button>
      </form>

      {/* 選択した月の履歴を表示 */}
      <h2>登録履歴</h2>

      <ul>
        {monthlyRecords.map((record) => (
          <li key={record.id}>
            {record.date}　{record.description}：
            {record.type === "income" ? "+" : "-"}
            {record.amount.toLocaleString()}円
          </li>
        ))}
      </ul>
    </main>
  );
}
