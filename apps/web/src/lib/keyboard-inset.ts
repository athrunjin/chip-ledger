/**
 * Phone keyboards cover the page without resizing it, so a dialog centered on the screen sits behind
 * one. This publishes the covered height as `--keyboard-inset`, and styles.css lifts dialogs by it.
 */
export function trackKeyboardInset() {
  const { visualViewport } = window;
  if (!visualViewport) return;

  const update = () => {
    const { height, offsetTop } = visualViewport;
    const inset = Math.max(0, window.innerHeight - height - offsetTop);
    document.documentElement.style.setProperty("--keyboard-inset", `${inset}px`);
  };
  visualViewport.addEventListener("resize", update);
  visualViewport.addEventListener("scroll", update);
  update();
}
