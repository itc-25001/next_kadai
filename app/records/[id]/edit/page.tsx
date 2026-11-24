"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "../../../../lib/supabase";
import styles from "./page.module.css";

type TransactionType = "income" | "expense";

export default function EditRecordPage() {
  // URLのIDと画面遷移
  const params = useParams<{ id: string }>();
  const id = params.id;
  const router = useRouter();

  // 編集フォームの状態管理
  const [date, setDate] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [found, setFound] = useState(false);
  const [notSignedIn, setNotSignedIn] = useState(false);
  const [error, setError] = useState("");

  // Supabaseから編集対象の記録を取得
  useEffect(() => {
    let active = true;

    async function fetchRecord() {
      setLoading(true);
      setError("");
      setFound(false);
      setNotSignedIn(false);

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();

        if (!active) return;

        if (authError || !authData.user) {
          setNotSignedIn(true);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("transactions")
          .select("id, type, amount, description, date")
          .eq("id", id)
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (!active) return;

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        if (data) {
          // 取得したデータを入力フォームに設定
          setDate(data.date);
          setType(data.type as TransactionType);
          setAmount(String(data.amount));
          setDescription(data.description);
          setFound(true);
        }
      } catch {
        if (active) setError("データの取得に失敗しました。");
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchRecord();

    return () => {
      active = false;
    };
  }, [id]);

  // 変更を保存する処理
  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (saving || !found) return;

    const value = Number(amount);

    // 入力内容を検証
    if (
      !Number.isSafeInteger(value) ||
      value <= 0 ||
      !date ||
      !description.trim()
    ) {
      setError("正しい金額・日付・内容を入力してください。");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();

      if (authError || !authData.user) {
        setError("ログインが必要です。");
        return;
      }

      // Supabaseの記録を更新
      const { data, error: updateError } = await supabase
        .from("transactions")
        .update({
          date: date,
          type: type,
          amount: value,
          description: description.trim(),
        })
        .eq("id", id)
        .eq("user_id", authData.user.id)
        .select("id")
        .maybeSingle();

      if (updateError) {
        setError(updateError.message);
        return;
      }

      if (!data) {
        setError("更新対象が見つからないか、更新権限がありません。");
        return;
      }

      // 更新成功後、詳細ページに戻る
      router.replace(`/records/${id}`);
    } catch {
      setError("通信エラーが発生しました。");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <h1>収支記録を編集</h1>

        {loading ? (
          <p>読み込み中...</p>
        ) : notSignedIn ? (
          <p>
            ログインが必要です。
            <Link href="/login">ログインする</Link>
          </p>
        ) : !found ? (
          <p>{error || "指定された収支記録が見つかりません。"}</p>
        ) : (
          <form onSubmit={handleSubmit} className={styles.form}>
            <label className={styles.field}>
              日付
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </label>

            <label className={styles.field}>
              種別
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TransactionType)}
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
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </label>

            {error && (
              <p role="alert" className={styles.error}>
                {error}
              </p>
            )}

            <button
              type="submit"
              className={styles.saveButton}
              disabled={saving}
            >
              {saving ? "保存中..." : "変更を保存"}
            </button>
          </form>
        )}

        <Link href={`/records/${id}`} className={styles.backLink}>
          詳細ページに戻る
        </Link>
      </div>
    </main>
  );
}
