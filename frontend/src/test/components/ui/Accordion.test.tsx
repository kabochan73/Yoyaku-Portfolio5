import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Accordion } from "@/components/ui/Accordion";

const loadPrices = jest.fn();

function PriceForm() {
  loadPrices();
  return <p>料金のフォーム</p>;
}

beforeEach(() => loadPrices.mockClear());

test("閉じている間は中身を描画しない", () => {
  render(
    <Accordion title="料金設定">
      <PriceForm />
    </Accordion>,
  );

  expect(screen.queryByText("料金のフォーム")).not.toBeInTheDocument();
  expect(loadPrices).not.toHaveBeenCalled();
});

test("見出しを押すと開いて中身が出て、もう一度押すと閉じる", async () => {
  render(
    <Accordion title="料金設定">
      <PriceForm />
    </Accordion>,
  );

  await userEvent.click(screen.getByText("料金設定"));
  expect(screen.getByText("料金のフォーム")).toBeInTheDocument();

  await userEvent.click(screen.getByText("料金設定"));
  expect(screen.queryByText("料金のフォーム")).not.toBeInTheDocument();
});

test("最初から開いておける", () => {
  render(
    <Accordion title="料金設定" defaultOpen>
      <PriceForm />
    </Accordion>,
  );

  expect(screen.getByText("料金のフォーム")).toBeInTheDocument();
});
