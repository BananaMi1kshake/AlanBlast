export function paintWorld(container, profile, colors = ["lilac", "sky", "mint", "sun", "coral"]) {
  container.dataset.palette = profile.palette;
  container.dataset.material = profile.material;
  container.replaceChildren(...colors.map(color => {
    const block = document.createElement("i");
    block.className = "block";
    block.dataset.color = color;
    return block;
  }));
}
