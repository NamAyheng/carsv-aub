(function () {
  function fillFromUser(select) {
    if (!select || !select.form) return;
    const option = select.options[select.selectedIndex];
    const form = select.form;
    const hasUser = option && option.value && !option.disabled;

    function setField(name, value) {
      const input =
        form.querySelector('[data-user-field="' + name + '"]') ||
        form.querySelector('[name="' + name + '"]');
      if (!input) return;
      if (input.disabled || input.readOnly || input.classList.contains("is-locked")) {
        input.value = value || "";
        return;
      }
      if (name === "department") {
        input.value = value || "";
      }
    }

    if (!hasUser) {
      ["name", "email", "phone", "status", "photo", "department", "position"].forEach(function (name) {
        setField(name, "");
      });
      return;
    }

    ["name", "email", "phone", "status", "photo", "department", "position"].forEach(function (name) {
      setField(name, option.getAttribute("data-" + name) || "");
    });
  }

  function enhanceUserPicker(select) {
    if (select.dataset.pickerReady === "1") return;
    select.dataset.pickerReady = "1";

    const wrap = document.createElement("div");
    wrap.className = "cf-user-picker";
    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);

    const button = document.createElement("button");
    button.type = "button";
    button.className = "cf-user-picker-btn";
    button.setAttribute("aria-haspopup", "listbox");
    wrap.appendChild(button);

    const menu = document.createElement("div");
    menu.className = "cf-user-picker-menu";
    menu.hidden = true;
    document.body.appendChild(menu);

    function syncButton() {
      const option = select.options[select.selectedIndex];
      button.textContent = option ? option.text : "Select a user account";
      button.classList.toggle("is-placeholder", !option || !option.value);
    }

    function close() {
      menu.hidden = true;
      wrap.classList.remove("is-open");
    }

    function positionMenu() {
      const rect = button.getBoundingClientRect();
      menu.style.left = rect.left + "px";
      menu.style.top = rect.bottom + 6 + "px";
      menu.style.width = rect.width + "px";
    }

    function open() {
      menu.innerHTML = "";
      Array.from(select.options).forEach(function (option, index) {
        const item = document.createElement("button");
        item.type = "button";
        item.className = "cf-user-picker-option";
        if (!option.value) item.classList.add("is-placeholder");
        if (option.disabled) {
          item.classList.add("is-taken");
          item.disabled = true;
        }
        if (option.selected) item.classList.add("is-selected");
        item.textContent = option.text;
        item.addEventListener("click", function () {
          if (option.disabled) return;
          select.selectedIndex = index;
          select.dispatchEvent(new Event("change", { bubbles: true }));
          syncButton();
          close();
        });
        menu.appendChild(item);
      });
      menu.hidden = false;
      wrap.classList.add("is-open");
      positionMenu();
    }

    button.addEventListener("click", function (event) {
      event.preventDefault();
      if (menu.hidden) open();
      else close();
    });

    document.addEventListener("mousedown", function (event) {
      if (menu.hidden) return;
      if (wrap.contains(event.target) || menu.contains(event.target)) return;
      close();
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape") close();
    });

    window.addEventListener("resize", function () {
      if (!menu.hidden) positionMenu();
    });

    const modal = select.closest(".cf-modal");
    if (modal) {
      modal.addEventListener("scroll", function () {
        if (!menu.hidden) close();
      });
    }

    select.addEventListener("change", syncButton);
    syncButton();
  }

  function bind() {
    document.querySelectorAll("select[data-user-picker]").forEach(function (select) {
      enhanceUserPicker(select);
      fillFromUser(select);
    });
    document.querySelectorAll('select[name="user"]:not([data-user-picker])').forEach(fillFromUser);
  }

  document.addEventListener("change", function (event) {
    if (event.target && event.target.matches('select[name="user"]')) {
      fillFromUser(event.target);
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
