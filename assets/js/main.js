/* =========================================================
   السكربت العام: القائمة، الحركات، السلة، الفوتر الديناميكي
   ========================================================= */
(function () {
  "use strict";
  var S = window.SITE || {};

  /* ---------- أدوات مساعدة ---------- */
  window.$ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  window.$$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  window.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  window.money = function (n) {
    if (n == null || isNaN(n)) return "حسب الطلب";
    return Number(n).toLocaleString("en-US") + " " + (S.currency || "ر.س");
  };
  window.waLink = function (text) {
    return "https://wa.me/" + (S.whatsapp || "") + "?text=" + encodeURIComponent(text || "");
  };

  /* ---------- تعبئة بيانات التواصل في كل مكان ---------- */
  function fillSiteData() {
    $$("[data-site]").forEach(function (el) {
      var key = el.getAttribute("data-site");
      var val = key.split(".").reduce(function (o, k) { return o ? o[k] : ""; }, S);
      if (val) el.textContent = val;
    });
    $$("[data-href]").forEach(function (el) {
      var t = el.getAttribute("data-href");
      if (t === "tel") el.href = "tel:" + (S.phone || "");
      if (t === "tel2") el.href = "tel:" + (S.phone2 || "");
      if (t === "mail") el.href = "mailto:" + (S.email || "");
      if (t === "wa") el.href = waLink("السلام عليكم، أرغب بالاستفسار عن منتجات " + (S.name || "") + " 🙏");
      if (t === "map") el.href = S.mapLink || "#";
    });
    /* روابط التواصل الاجتماعي: إخفاء غير المعبأ */
    $$("[data-social]").forEach(function (el) {
      var k = el.getAttribute("data-social");
      var url = (S.social || {})[k];
      if (url) { el.href = url; } else { el.remove(); }
    });
    /* سنة الحقوق */
    $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });
    /* رقم الهاتف بصيغة عرض */
    $$("[data-phone-text]").forEach(function (el) { el.textContent = S.phone || ""; });
  }

  /* ---------- القائمة للجوال ---------- */
  function initNav() {
    var burger = $(".burger"), nav = $(".nav");
    if (!burger || !nav) return;
    var overlay = document.createElement("div");
    overlay.className = "nav-overlay";
    document.body.appendChild(overlay);
    function toggle(open) {
      nav.classList.toggle("open", open);
      overlay.classList.toggle("show", open);
      document.body.style.overflow = open ? "hidden" : "";
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    }
    burger.addEventListener("click", function () { toggle(!nav.classList.contains("open")); });
    overlay.addEventListener("click", function () { toggle(false); });
    $$(".nav a").forEach(function (a) { a.addEventListener("click", function () { toggle(false); }); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") toggle(false); });

    /* تفعيل الرابط الحالي */
    var page = location.pathname.split("/").pop() || "index.html";
    $$(".nav a").forEach(function (a) {
      var href = a.getAttribute("href");
      if (href === page) a.classList.add("active");
    });
  }

  /* ---------- حركة الظهور عند التمرير ---------- */
  var _io = null;
  window.observeReveals = function () {
    var items = $$(".reveal:not(.in)");
    if (!items.length) return;
    if (!("IntersectionObserver" in window)) { items.forEach(function (i) { i.classList.add("in"); }); return; }
    if (!_io) {
      _io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("in"); _io.unobserve(e.target); }
        });
      }, { threshold: 0.08 });
    }
    items.forEach(function (i) { _io.observe(i); });
  };

  /* ---------- زر العودة للأعلى ---------- */
  function initTopBtn() {
    var btn = $(".fab .top");
    if (!btn) return;
    window.addEventListener("scroll", function () {
      btn.classList.toggle("show", window.scrollY > 500);
    }, { passive: true });
    btn.addEventListener("click", function () { window.scrollTo({ top: 0, behavior: "smooth" }); });
  }

  /* ---------- الأسئلة الشائعة ---------- */
  window.initFaqToggles = function (root) {
    $$(".faq-item button", root || document).forEach(function (b) {
      b.addEventListener("click", function () {
        var item = b.closest(".faq-item");
        var isOpen = item.classList.contains("open");
        item.classList.toggle("open", !isOpen);
        b.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });
    });
  };

  /* =========================================================
     سلة الطلب (تُحفظ في متصفح الزائر)
     ========================================================= */
  var KEY = "bq_cart_v1";
  window.Cart = {
    items: function () {
      try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch (e) { return []; }
    },
    save: function (items) {
      try { localStorage.setItem(KEY, JSON.stringify(items)); } catch (e) {}
      this.updateBadge();
      document.dispatchEvent(new CustomEvent("cart:change"));
    },
    add: function (item) {
      var items = this.items();
      item.uid = item.uid || (item.id + "-" + Date.now());
      items.push(item);
      this.save(items);
    },
    remove: function (uid) {
      this.save(this.items().filter(function (i) { return i.uid !== uid; }));
    },
    setQty: function (uid, qty) {
      var items = this.items();
      items.forEach(function (i) { if (i.uid === uid) i.qty = Math.max(1, parseInt(qty, 10) || 1); });
      this.save(items);
    },
    clear: function () { this.save([]); },
    count: function () {
      return this.items().reduce(function (s, i) { return s + (parseInt(i.qty, 10) || 1); }, 0);
    },
    /* حساب الكمية الفعلية للقطعة الواحدة حسب وحدة القياس */
    lineArea: function (i) {
      if (i.unit === "م²" && i.width && i.height) return (Number(i.width) * Number(i.height)) / 10000; // سم → م²
      if (i.unit === "م.ط" && i.length) return Number(i.length) / 100; // سم → متر طولي
      return 1;
    },
    lineTotal: function (i) {
      if (i.price == null) return null;
      var q = parseInt(i.qty, 10) || 1;
      return Math.round(i.price * this.lineArea(i) * q);
    },
    total: function () {
      var self = this, sum = 0, hasUnknown = false;
      this.items().forEach(function (i) {
        var t = self.lineTotal(i);
        if (t == null) hasUnknown = true; else sum += t;
      });
      return { sum: sum, hasUnknown: hasUnknown };
    },
    updateBadge: function () {
      var n = this.count();
      $$(".cart-count").forEach(function (el) {
        el.textContent = n;
        el.style.display = n ? "flex" : "none";
      });
    }
  };

  /* ---------- إشعار صغير ---------- */
  window.toast = function (msg, type) {
    var t = document.createElement("div");
    t.textContent = msg;
    t.style.cssText =
      "position:fixed;inset-block-end:24px;inset-inline-start:24px;z-index:200;padding:13px 20px;border-radius:12px;" +
      "background:" + (type === "err" ? "#c0392b" : "#0d1b2a") + ";color:#fff;font-family:inherit;font-weight:600;" +
      "box-shadow:0 12px 32px rgba(0,0,0,.25);opacity:0;transform:translateY(14px);transition:.28s;max-width:86vw";
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.style.opacity = "1"; t.style.transform = "none"; });
    setTimeout(function () {
      t.style.opacity = "0"; t.style.transform = "translateY(14px)";
      setTimeout(function () { t.remove(); }, 300);
    }, 2600);
  };

  /* ---------- بطاقة منتج (تُستخدم في أكثر من صفحة) ---------- */
  window.productCard = function (p) {
    var showPrice = (S.order && S.order.showPrices) !== false;
    var cat = (window.CATEGORIES || []).filter(function (c) { return c.id === p.cat; })[0];
    return '' +
      '<article class="card reveal">' +
        '<a class="card__media" href="product.html?id=' + encodeURIComponent(p.id) + '">' +
          '<img src="' + esc(p.img[0]) + '" alt="' + esc(p.name) + '" loading="lazy" ' +
               'onerror="this.src=\'assets/img/placeholder.svg\'">' +
          (cat ? '<span class="card__tag">' + esc(cat.name) + '</span>' : '') +
        '</a>' +
        '<div class="card__body">' +
          '<h3><a href="product.html?id=' + encodeURIComponent(p.id) + '">' + esc(p.name) + '</a></h3>' +
          '<p>' + esc(p.short) + '</p>' +
          '<div class="card__meta">' +
            (showPrice
              ? '<span class="price">' +
                  (p.price == null ? 'السعر حسب الطلب' : 'يبدأ من ' + money(p.price) + ' <small>/ ' + esc(p.unit) + '</small>') +
                '</span>'
              : '<span class="price price--quote">📐 يُنفّذ حسب المقاس</span>') +
          '</div>' +
          '<div class="card__actions">' +
            '<a class="btn btn--primary btn--sm" href="product.html?id=' + encodeURIComponent(p.id) + '">اطلب الآن</a>' +
            '<a class="btn btn--ghost btn--sm" target="_blank" rel="noopener" href="' +
              waLink("السلام عليكم، أرغب بالاستفسار عن: " + p.name) + '">واتساب</a>' +
          '</div>' +
        '</div>' +
      '</article>';
  };

  /* ---------- تشغيل ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    fillSiteData();
    initNav();
    observeReveals();
    initTopBtn();
    Cart.updateBadge();
    initFaqToggles();
    /* إخفاء الأسعار كلياً إن كانت معطّلة */
    if (S.order && S.order.showPrices === false) {
      $$("[data-price-block]").forEach(function (el) { el.remove(); });
    }
  });
  document.addEventListener("cart:change", function () { Cart.updateBadge(); });
})();
