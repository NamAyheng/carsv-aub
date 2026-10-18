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

(function () {
  function stash(select) {
    if (select._visitOptions) return;
    select._visitOptions = Array.from(select.options).map(function (option) {
      return option.cloneNode(true);
    });
  }

  function rebuild(select, keep) {
    stash(select);
    const current = select.value;
    select.innerHTML = "";
    select._visitOptions.forEach(function (option) {
      if (!option.value || keep(option)) select.appendChild(option.cloneNode(true));
    });
    select.value = current;
    if (select.value !== current) select.value = "";
  }

  function lock(form, name, locked) {
    const input = form.querySelector('[name="' + name + '"]');
    if (!input || input.dataset.serverLocked === "1") return;
    input.disabled = locked;
    const field = input.closest(".cf-field");
    if (field) field.classList.toggle("is-locked", locked);
  }

  function bindWorkOrder(form) {
    const customer = form.querySelector('[name="customer"]');
    const vehicle = form.querySelector('[name="vehicle"]');
    const booking = form.querySelector('[name="booking"][data-visit-source]');
    if (!customer || !vehicle || !booking || form.dataset.visitReady === "1") return;
    form.dataset.visitReady = "1";
    ["customer", "vehicle", "booking", "problem", "start_date"].forEach(function (name) {
      const input = form.querySelector('[name="' + name + '"]');
      if (input && input.hasAttribute("data-server-locked")) input.dataset.serverLocked = "1";
    });

    const jobFields = ["mechanic", "estimated_end", "status"];

    function sync() {
      const customerId = customer.value;
      rebuild(vehicle, function (option) {
        return option.getAttribute("data-customer") === customerId;
      });
      const vehicleId = vehicle.value;
      rebuild(booking, function (option) {
        return option.getAttribute("data-customer") === customerId && option.getAttribute("data-vehicle") === vehicleId;
      });
      const chosen = booking.options[booking.selectedIndex];
      const hasBooking = Boolean(chosen && chosen.value);
      lock(form, "vehicle", !customerId);
      lock(form, "booking", !vehicleId);
      lock(form, "problem", true);
      lock(form, "start_date", true);
      const problem = form.querySelector('[name="problem"]');
      const start = form.querySelector('[name="start_date"]');
      if (problem && !problem.dataset.serverLocked) {
        problem.value = hasBooking ? (chosen.getAttribute("data-problem") || "").replace(/\\n/g, "\n") : "";
      }
      if (start && !start.dataset.serverLocked) {
        start.value = hasBooking ? chosen.getAttribute("data-start") || "" : "";
      }
      jobFields.forEach(function (name) {
        lock(form, name, !hasBooking);
      });
      lock(form, "progress", true);
      paintProgress(form);
    }

    customer.addEventListener("change", function () {
      vehicle.value = "";
      booking.value = "";
      sync();
    });
    vehicle.addEventListener("change", function () {
      booking.value = "";
      sync();
    });
    booking.addEventListener("change", sync);
    sync();
  }

  const PROGRESS_FOR_STATUS = {
    WAITING: 0,
    DIAGNOSING: 20,
    WAITING_APPROVAL: 40,
    REPAIRING: 60,
    QUALITY_CHECK: 80,
    READY_FOR_PICKUP: 90,
    COMPLETED: 100,
  };

  function paintProgress(form) {
    if (!form) return;
    const status = form.querySelector('select[name="status"]');
    const progress = form.querySelector('[name="progress"]');
    if (!status || !progress) return;
    const value = Object.prototype.hasOwnProperty.call(PROGRESS_FOR_STATUS, status.value)
      ? PROGRESS_FOR_STATUS[status.value]
      : 0;
    progress.value = String(value);
    const fill = form.querySelector(".cf-progress-fill");
    if (fill) fill.style.width = value + "%";
  }

  function paintStatus(select) {
    if (!select || select.name !== "status") return;
    const option = select.options[select.selectedIndex];
    select.setAttribute("data-tone", option ? option.getAttribute("data-tone") || "" : "");
  }

  function bindInspection(form) {
    const job = form.querySelector('[name="repair_job"][data-inspection-job]');
    const complaint = form.querySelector('[name="complaint"]');
    if (!job || !complaint || form.dataset.inspectionReady === "1") return;
    form.dataset.inspectionReady = "1";
    function sync() {
      const chosen = job.options[job.selectedIndex];
      complaint.value = chosen ? (chosen.getAttribute("data-problem") || "").replace(/\\n/g, "\n") : "";
    }
    job.addEventListener("change", sync);
    sync();
  }

  function setLockedFollow(form, name, text) {
    const value =
      form.querySelector('[data-invoice-follow="' + name + '"]') ||
      form.querySelector('[data-payment-follow="' + name + '"]') ||
      form.querySelector('[data-part-request-follow="' + name + '"]') ||
      form.querySelector('[data-locked-for="' + name + '"]');
    if (value) value.textContent = text || "—";
  }

  function bindInvoice(form) {
    const job = form.querySelector('[name="repair_job"][data-invoice-source]');
    if (!job || form.dataset.invoiceReady === "1") return;
    form.dataset.invoiceReady = "1";

    function sync() {
      const chosen = job.options[job.selectedIndex];
      const hasJob = Boolean(chosen && chosen.value);
      const customerLabel = hasJob ? chosen.getAttribute("data-customer-label") || "—" : "Select a work order";
      const vehicleLabel = hasJob ? chosen.getAttribute("data-vehicle-label") || "—" : "Select a work order";
      const bookingLabel = hasJob ? chosen.getAttribute("data-booking-label") || "—" : "—";
      setLockedFollow(form, "customer", customerLabel);
      setLockedFollow(form, "vehicle", vehicleLabel);
      setLockedFollow(form, "booking", bookingLabel);
    }

    job.addEventListener("change", sync);
    sync();
  }

  function bindPayment(form) {
    const invoice = form.querySelector('[name="invoice"][data-payment-source]');
    if (!invoice || form.dataset.paymentReady === "1") return;
    form.dataset.paymentReady = "1";

    function sync() {
      const chosen = invoice.options[invoice.selectedIndex];
      const hasInvoice = Boolean(chosen && chosen.value);
      const customerLabel = hasInvoice
        ? chosen.getAttribute("data-customer-label") || "—"
        : "Select an invoice";
      const vehicleLabel = hasInvoice
        ? chosen.getAttribute("data-vehicle-label") || "—"
        : "Select an invoice";
      const customerBox =
        form.querySelector('[data-payment-follow="customer"]') ||
        form.querySelector('[data-locked-for="customer"]');
      const vehicleBox =
        form.querySelector('[data-payment-follow="vehicle"]') ||
        form.querySelector('[data-locked-for="vehicle"]');
      if (customerBox) customerBox.textContent = customerLabel;
      if (vehicleBox) vehicleBox.textContent = vehicleLabel;
    }

    invoice.addEventListener("change", sync);
    sync();
  }

  function bindPartRequest(form) {
    const booking = form.querySelector('[name="booking"][data-part-request-booking]');
    if (!booking || form.dataset.partRequestReady === "1") return;
    form.dataset.partRequestReady = "1";

    function sync() {
      const chosen = booking.options[booking.selectedIndex];
      const hasBooking = Boolean(chosen && chosen.value);
      const customerLabel = hasBooking
        ? chosen.getAttribute("data-customer-label") || "—"
        : "Select a booking";
      const vehicleLabel = hasBooking
        ? chosen.getAttribute("data-vehicle-label") || "—"
        : "Select a booking";
      const jobLabel = hasBooking
        ? chosen.getAttribute("data-job-label") || "No work order yet (quote)"
        : "Select a booking";
      setLockedFollow(form, "customer", customerLabel);
      setLockedFollow(form, "vehicle", vehicleLabel);
      setLockedFollow(form, "repair_job", jobLabel);
    }

    booking.addEventListener("change", sync);
    sync();
  }

  function bindVisits() {
    document.querySelectorAll(".cf-modal form").forEach(function (form) {
      bindWorkOrder(form);
      bindInspection(form);
      bindInvoice(form);
      bindPayment(form);
      bindPartRequest(form);
    });
    document.querySelectorAll('select[name="status"]').forEach(function (select) {
      paintStatus(select);
      select.addEventListener("change", function () {
        paintStatus(select);
        paintProgress(select.closest("form"));
      });
      paintProgress(select.closest("form"));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bindVisits);
  } else {
    bindVisits();
  }
})();
