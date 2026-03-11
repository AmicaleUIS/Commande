const burgerBtn = document.getElementById("burgerBtn");
const mobileMenu = document.getElementById("mobileMenu");

if (burgerBtn && mobileMenu) {
  burgerBtn.addEventListener("click", () => {
    const isOpen = mobileMenu.classList.toggle("open");
    burgerBtn.classList.toggle("open", isOpen);
    burgerBtn.setAttribute("aria-expanded", String(isOpen));
  });

  mobileMenu.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      mobileMenu.classList.remove("open");
      burgerBtn.classList.remove("open");
      burgerBtn.setAttribute("aria-expanded", "false");
    });
  });
}