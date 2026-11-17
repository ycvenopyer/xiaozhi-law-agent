/** Assemble a public CloudBase key without exceeding per-variable host limits. */
export function assemblePublishableKey(variables, name) {
  const single = String(variables[name] ?? '').trim();
  const prefix = `${name}_PART_`;
  const pieces = Object.entries(variables)
    .filter(([key, value]) => key.startsWith(prefix) && value !== undefined && value !== '')
    .map(([key, value]) => ({ key, index: Number(key.slice(prefix.length)), value: String(value).trim() }))
    .sort((a, b) => a.index - b.index);
  if (single && pieces.length) throw new Error(`${name}：请只配置完整值或 PART 分段中的一种，移除旧配置后重新部署。`);
  if (single) return single;
  for (let index = 0; index < pieces.length; index++) {
    const piece = pieces[index];
    if (piece.index !== index + 1 || piece.key !== `${prefix}${index + 1}` || pieces.length > 16) {
      throw new Error(`${name}：分段必须从 PART_1 开始连续编号，最多 16 段。`);
    }
    if (!piece.value || piece.value.length > 1000 || !/^[A-Za-z0-9_.-]+$/.test(piece.value)) {
      throw new Error(`${piece.key}：请填写不超过 1000 字节的完整 ASCII 片段，不要加入引号、换行或省略号。`);
    }
  }
  return pieces.map(piece => piece.value).join('');
}
