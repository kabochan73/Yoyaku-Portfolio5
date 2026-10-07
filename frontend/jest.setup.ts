import "@testing-library/jest-dom";
import { configure } from "@testing-library/react";
import { server } from "@/test/msw/server";

// jsdom は <dialog> の showModal と close を持っていないので、開閉だけを真似る
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(
    this: HTMLDialogElement,
  ) {
    this.setAttribute("open", "");
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
}

// 全テストを並列で流すと、画面が変わるまでに標準の1秒を超えることがある
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

afterEach(() => server.resetHandlers());

afterAll(() => server.close());
