export function hexToHsl(hex: string): [number, number, number] {
  const r = Number.parseInt(hex.slice(1, 3), 16) / 255;
  const g = Number.parseInt(hex.slice(3, 5), 16) / 255;
  const b = Number.parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return [h * 360, s * 100, l * 100];
}

export function hslToHex(h: number, s: number, l: number): string {
  l /= 100;
  const a = (s * Math.min(l, 1 - l)) / 100;
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function generateGradientColors(baseColor: string, count: number): string[] {
  const [h, s, l] = hexToHsl(baseColor);
  const colors: string[] = [];

  for (let i = 0; i < count; i++) {
    const lightness = Math.max(20, Math.min(80, l + (i - count / 2) * 15));
    const saturation = Math.max(30, Math.min(90, s + (i - count / 2) * 10));
    colors.push(hslToHex(h, saturation, lightness));
  }

  return colors;
}

export function getColorVariables(color: string, index: number) {
  const [h, s, l] = hexToHsl(color);
  return {
    "--category-color": `${h} ${s}% ${l}%`,
    "--category-color-light": `${h} ${Math.max(20, s - 20)}% ${Math.min(95, l + 20)}%`,
    "--category-color-dark": `${h} ${Math.min(100, s + 10)}% ${Math.max(10, l - 20)}%`,
  };
}
