export function pageItems(items, requested, pageSize) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.max(0, Math.min(pages - 1, Math.trunc(requested) || 0));
  return { page, pages, items: items.slice(page * pageSize, (page + 1) * pageSize) };
}

export function createPager(element) {
  const previous = element.querySelector("button:first-child");
  const next = element.querySelector("button:last-child");
  const output = element.querySelector("output");
  let render;
  let page = 0;

  function update(items, size, present) {
    const state = pageItems(items, page, size);
    page = state.page;
    previous.disabled = page === 0;
    next.disabled = page + 1 >= state.pages;
    output.value = `Page ${page + 1} of ${state.pages}`;
    element.hidden = state.pages === 1;
    present(state.items);
    render = () => update(items, size, present);
  }

  function step(direction) {
    page += direction;
    render?.();
    const active = direction < 0 ? previous : next;
    if (active.disabled) (direction < 0 ? next : previous).focus({ preventScroll: true });
  }
  previous.addEventListener("click", () => step(-1));
  next.addEventListener("click", () => step(1));
  return { update, reset() { page = 0; } };
}
