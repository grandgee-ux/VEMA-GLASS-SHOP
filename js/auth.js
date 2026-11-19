(function () {
  const accounts = {
    admin: { username: "admin", password: "admin123", name: "Administrator", role: "admin" },
    staff: { username: "staff", password: "staff123", name: "Staff Member", role: "staff" },
    customer: { username: "customer", password: "customer123", name: "Customer", role: "customer" }
  };

  function currentUser() {
    try { return JSON.parse(sessionStorage.getItem("glassMartUser") || "null"); }
    catch (_) { return null; }
  }

  function signOut() {
    sessionStorage.removeItem("glassMartUser");
    window.location.replace("../index.html");
  }

  window.GlassMartAuth = {
    currentUser,
    signOut,
    requireRole: function (allowedRole) {
      const user = currentUser();
      if (!user) {
        const inWorkspace = /\/(admin|staff|customer)\//.test(window.location.pathname);
        window.location.replace(inWorkspace ? "../index.html" : "index.html");
        return null;
      }
      if (user.role !== allowedRole) {
        window.location.replace("../" + user.role + "/dashboard.html");
        return null;
      }
      return user;
    }
  };

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("loginForm");
    if (form) {
      const existing = currentUser();
      if (existing && existing.role && ["admin", "staff", "customer"].includes(existing.role)) {
        window.location.replace(existing.role + "/dashboard.html");
        return;
      }
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        const username = document.getElementById("username").value.trim().toLowerCase();
        const password = document.getElementById("password").value;
        const account = Object.values(accounts).find(a => a.username === username && a.password === password);
        const error = document.getElementById("loginError");
        if (!account) {
          error.textContent = "Incorrect username or password. Please try again.";
          return;
        }
        sessionStorage.setItem("glassMartUser", JSON.stringify({
          username: account.username, name: account.name, role: account.role
        }));
        window.location.href = account.role + "/dashboard.html";
      });
    }

    document.querySelectorAll("[data-logout]").forEach(button => {
      button.addEventListener("click", function () {
        sessionStorage.removeItem("glassMartUser");
        const inWorkspace = /\/(admin|staff|customer)\//.test(window.location.pathname);
        window.location.replace(inWorkspace ? "../index.html" : "index.html");
      });
    });
  });
})();
