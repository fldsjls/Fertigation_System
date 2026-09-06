/* Non-layout feedback: transient notifications and actionable error dialogs. */
(function () {
  "use strict";
  let toast, content, timer, errorDialog, errorText;
  function dismiss() {
    clearTimeout(timer);
    if (!toast) return;
    if (toast.matches(":popover-open")) toast.hidePopover();
    toast.hidden = true;
  }
  function schedule() {
    clearTimeout(timer);
    if (toast && !toast.hidden && toast.dataset.kind !== "warning" && !toast.matches(":hover") && !toast.contains(document.activeElement)) timer = setTimeout(dismiss, 4500);
  }
  function ensureToast() {
    if (toast) return;
    toast = document.createElement("aside");
    toast.className = "workbench-toast";
    toast.hidden = true;
    if (typeof toast.showPopover === "function") toast.setAttribute("popover", "manual");
    content = document.createElement("div");
    content.setAttribute("role", "status");
    content.setAttribute("aria-live", "polite");
    content.setAttribute("aria-atomic", "true");
    const close = document.createElement("button");
    close.type = "button"; close.textContent = "×"; close.setAttribute("aria-label", "关闭提示");
    close.addEventListener("click", dismiss);
    toast.append(content, close); document.body.append(toast);
    toast.addEventListener("mouseenter", () => clearTimeout(timer));
    toast.addEventListener("mouseleave", schedule);
    toast.addEventListener("focusin", () => clearTimeout(timer));
    toast.addEventListener("focusout", () => setTimeout(schedule, 0));
    toast.addEventListener("keydown", event => { if (event.key === "Escape") { event.stopPropagation(); dismiss(); } });
  }
  function showError(text) {
    dismiss();
    if (!errorDialog) {
      errorDialog = document.createElement("dialog");
      errorDialog.className = "workbench-feedback-dialog";
      errorDialog.setAttribute("aria-labelledby", "workbench-feedback-title");
      errorDialog.setAttribute("aria-describedby", "workbench-feedback-description");
      const heading = document.createElement("h2"); heading.id = "workbench-feedback-title"; heading.textContent = "请检查后重试";
      errorText = document.createElement("p"); errorText.id = "workbench-feedback-description";
      const close = document.createElement("button"); close.type = "button"; close.textContent = "知道了"; close.autofocus = true;
      close.addEventListener("click", () => errorDialog.close());
      errorDialog.append(heading, errorText, close); document.body.append(errorDialog);
    }
    errorText.textContent = text;
    if (!errorDialog.open) errorDialog.showModal();
  }
  window.WorkbenchFeedback = {
    show(text, kind = "info") {
      if (!text) return;
      if (kind === "error") { showError(text); return; }
      ensureToast();
      if (!toast.hidden && content.textContent === text && toast.dataset.kind === kind) return;
      toast.dataset.kind = kind; toast.hidden = false;
      if (toast.hasAttribute("popover") && !toast.matches(":popover-open")) toast.showPopover();
      content.textContent = text; schedule();
    },
    dismiss
  };
}());
