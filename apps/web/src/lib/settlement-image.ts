/**
 * Draws the settlement result as a PNG. It uses Canvas directly because the content is only text and lines,
 * so no DOM screenshot library is needed; those tend to lose fonts on iOS Safari.
 */
export interface SettlementImageData {
  title: string;
  subtitle: string;
  transfers: readonly { from: string; to: string; amount: string }[];
  nets: readonly { name: string; amount: string }[];
}

// The image ignores the system theme and always uses the dark table colors
const COLOR = {
  bg: "#13241e",
  row: "#1a3129",
  text: "#e7ede9",
  muted: "#93a59d",
  gold: "#d6b04c",
};

const WIDTH = 1080;
const PADDING = 64;
const ROW_HEIGHT = 104;
const ROW_GAP = 16;
const TRANSFER_NAME_MAX_WIDTH = 270;
const NET_NAME_MAX_WIDTH = 560;

function truncate(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const chars = [...text];
  while (chars.length > 0 && ctx.measureText(`${chars.join("")}…`).width > maxWidth) chars.pop();
  return `${chars.join("")}…`;
}

function roundedRow(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = COLOR.row;
  ctx.beginPath();
  ctx.roundRect(PADDING, y, WIDTH - PADDING * 2, ROW_HEIGHT, 20);
  ctx.fill();
}

export async function renderSettlementImage(data: SettlementImageData): Promise<Blob> {
  await document.fonts.ready;

  const sections = (data.transfers.length > 0 ? 1 : 0) + 1;
  const rows = data.transfers.length + data.nets.length;
  const height = 240 + sections * 84 + rows * (ROW_HEIGHT + ROW_GAP) + PADDING - ROW_GAP;

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create canvas");
  const ctx = context;
  const family = getComputedStyle(document.body).fontFamily;
  const font = (size: number, weight = 500) => `${weight} ${size}px ${family}`;

  ctx.fillStyle = COLOR.bg;
  ctx.fillRect(0, 0, WIDTH, height);
  ctx.textBaseline = "middle";

  ctx.fillStyle = COLOR.gold;
  ctx.fillRect(0, 0, WIDTH, 12);

  ctx.fillStyle = COLOR.text;
  ctx.font = font(64, 700);
  ctx.fillText(data.title, PADDING, 120);
  ctx.fillStyle = COLOR.muted;
  ctx.font = font(36);
  ctx.fillText(data.subtitle, PADDING, 192);

  let y = 240;

  function heading(text: string) {
    y += 40;
    ctx.fillStyle = COLOR.text;
    ctx.font = font(40, 600);
    ctx.fillText(text, PADDING, y);
    y += 44;
  }

  function amountAtRight(text: string, rowCenter: number, color: string) {
    ctx.textAlign = "right";
    ctx.fillStyle = color;
    ctx.font = font(44, 700);
    ctx.fillText(text, WIDTH - PADDING - 36, rowCenter);
    ctx.textAlign = "left";
  }

  if (data.transfers.length > 0) {
    heading("转账方案");
    for (const { from, to, amount } of data.transfers) {
      roundedRow(ctx, y);
      const center = y + ROW_HEIGHT / 2;
      ctx.font = font(40);
      ctx.fillStyle = COLOR.text;
      const fromText = truncate(ctx, from, TRANSFER_NAME_MAX_WIDTH);
      const toText = truncate(ctx, to, TRANSFER_NAME_MAX_WIDTH);
      let x = PADDING + 36;
      ctx.fillText(fromText, x, center);
      x += ctx.measureText(fromText).width + 20;
      ctx.fillStyle = COLOR.muted;
      ctx.fillText("→", x, center);
      x += ctx.measureText("→").width + 20;
      ctx.fillStyle = COLOR.text;
      ctx.fillText(toText, x, center);
      amountAtRight(amount, center, COLOR.gold);
      y += ROW_HEIGHT + ROW_GAP;
    }
  }

  heading("输赢");
  for (const { name, amount } of data.nets) {
    roundedRow(ctx, y);
    const center = y + ROW_HEIGHT / 2;
    ctx.font = font(40);
    ctx.fillStyle = COLOR.text;
    ctx.fillText(truncate(ctx, name, NET_NAME_MAX_WIDTH), PADDING + 36, center);
    amountAtRight(amount, center, COLOR.text);
    y += ROW_HEIGHT + ROW_GAP;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Could not generate image"))));
  });
}
