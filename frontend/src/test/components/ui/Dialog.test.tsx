import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";

function Example({ closable = true }: { closable?: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        電話予約を登録
      </button>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="電話予約の登録"
        closable={closable}
      >
        <button type="button">戻る</button>
        <label htmlFor="booker_name">予約者名</label>
        <input id="booker_name" />
      </Dialog>
    </>
  );
}

async function openDialog() {
  await userEvent.click(screen.getByRole("button", { name: "電話予約を登録" }));
  return screen.getByRole("dialog", { name: "電話予約の登録" });
}

test("開くまでは見えず、開くとタイトルを名前にしたダイアログが見える", async () => {
  render(<Example />);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(await openDialog()).toBeVisible();
});

test("閉じている間は、中身を描画しない", async () => {
  render(<Example />);

  expect(screen.queryByLabelText("予約者名")).not.toBeInTheDocument();
  const dialog = await openDialog();
  expect(screen.getByLabelText("予約者名")).toBeInTheDocument();

  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  expect(screen.queryByLabelText("予約者名")).not.toBeInTheDocument();
});

test("開くと、最初の入力欄にフォーカスが移る", async () => {
  render(<Example />);

  await openDialog();

  expect(screen.getByLabelText("予約者名")).toHaveFocus();
});

test("Esc で閉じ、開いたボタンにフォーカスが戻る", async () => {
  render(<Example />);
  const dialog = await openDialog();

  fireEvent(dialog, new Event("cancel", { cancelable: true }));

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "電話予約を登録" })).toHaveFocus();
});

test("背景を押すと閉じる", async () => {
  render(<Example />);
  const dialog = await openDialog();

  await userEvent.click(dialog);

  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("閉じられないときは、Esc でも背景でも閉じない", async () => {
  render(<Example closable={false} />);
  const dialog = await openDialog();

  fireEvent(dialog, new Event("cancel", { cancelable: true }));
  await userEvent.click(dialog);

  expect(screen.getByRole("dialog")).toBeVisible();
});

test("中身を押しても閉じない", async () => {
  render(<Example />);
  await openDialog();

  await userEvent.click(screen.getByLabelText("予約者名"));

  expect(screen.getByRole("dialog")).toBeVisible();
});
