"use client";

import { useState } from "react";
import { ErrorState } from "@/components/ui/ErrorState";
import { FormField } from "@/components/ui/FormField";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useSearchUsers } from "../logic/hooks";

const SEARCH_DELAY_MS = 300;

export function UserSearch() {
  const [input, setInput] = useState("");
  const keyword = useDebouncedValue(input, SEARCH_DELAY_MS).trim();
  const search = useSearchUsers(keyword);
  const result = keyword === "" ? undefined : search.data;

  return (
    <div className="space-y-4">
      <FormField
        label="名前またはメールアドレス"
        name="search"
        type="search"
        maxLength={255}
        autoComplete="off"
        value={input}
        onChange={(event) => setInput(event.target.value)}
      />
      {keyword === "" ? (
        <p className="text-sm text-zinc-500">
          名前またはメールアドレスで検索できます。
        </p>
      ) : search.isError && !search.isPlaceholderData ? (
        <ErrorState
          message="検索できませんでした。"
          onRetry={() => void search.refetch()}
        />
      ) : result === undefined ? null : result.users.length === 0 ? (
        <p className="text-sm text-zinc-500">該当する会員はいません。</p>
      ) : (
        <div
          className={`space-y-2 transition-opacity ${search.isPlaceholderData ? "opacity-50" : ""}`}
          data-testid="user-search-results"
          data-dimmed={search.isPlaceholderData}
        >
          {result.users.length === result.limit && (
            <p className="text-sm text-zinc-500">
              上位{result.limit}件を表示しています。条件を絞ってください。
            </p>
          )}
          <div className="overflow-x-auto rounded-md border border-zinc-200 bg-white">
            <table className="w-full text-sm">
              <thead className="text-left text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">
                    名前
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    メールアドレス
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    予約件数
                  </th>
                </tr>
              </thead>
              <tbody>
                {result.users.map((user) => (
                  <tr key={user.id} className="border-t border-zinc-100">
                    <td className="px-4 py-2">{user.name}</td>
                    <td className="px-4 py-2 break-all">{user.email}</td>
                    <td className="px-4 py-2 text-right">
                      {user.confirmed_reservations_count}件
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
