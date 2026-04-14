const STORAGE_KEY = "kgwDonations";
const POSTS_STORAGE_KEY = "kgwPosts";

function safeParseArray(raw) {
  try {
	const parsed = raw ? JSON.parse(raw) : [];
	return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
	return [];
  }
}

function getStoredDonations() {
  return safeParseArray(localStorage.getItem(STORAGE_KEY));
}

function saveDonations(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getStoredPosts() {
  return safeParseArray(localStorage.getItem(POSTS_STORAGE_KEY));
}

function savePosts(data) {
  localStorage.setItem(POSTS_STORAGE_KEY, JSON.stringify(data));
}

function showFormMessage(node, type, text) {
  if (!node) {
	return;
  }
  node.hidden = false;
  node.className = `form-message ${type}`;
  node.textContent = text;
}

function escapeHtml(value) {
  return String(value || "")
	.replace(/&/g, "&amp;")
	.replace(/</g, "&lt;")
	.replace(/>/g, "&gt;")
	.replace(/\"/g, "&quot;")
	.replace(/'/g, "&#39;");
}

function formatPaymentMethod(value) {
  const map = {
	przelew: "Przelew",
	blik: "BLIK",
	gotowka: "Gotowka"
  };
  return map[value] || value || "-";
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("pl-PL");
}

function setupDonationForm() {
  const form = document.getElementById("donationForm");
  if (!form) {
	return;
  }

  const messageNode = document.getElementById("donationMessage");
  const quickAmountInputs = form.querySelectorAll("input[name='quickAmount']");
  const amountInput = document.getElementById("amount");

  quickAmountInputs.forEach((radio) => {
	radio.addEventListener("change", () => {
	  amountInput.value = radio.value;
	});
  });

  form.addEventListener("submit", (event) => {
	event.preventDefault();

	const fields = {
	  fullName: document.getElementById("fullName"),
	  email: document.getElementById("email"),
	  phone: document.getElementById("phone"),
	  paymentMethod: document.getElementById("paymentMethod"),
	  amount: document.getElementById("amount"),
	  consent: document.getElementById("consent")
	};

	const errors = {};
	const fullName = fields.fullName.value.trim();
	const email = fields.email.value.trim();
	const phone = fields.phone.value.trim();
	const paymentMethod = fields.paymentMethod.value;
	const amount = Number(fields.amount.value);

	if (fullName.length < 2) {
	  errors.fullName = "Podaj pelne imie i nazwisko.";
	}
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
	  errors.email = "Podaj poprawny adres email.";
	}
	if (phone && !/^\+?\d{9,15}$/.test(phone.replace(/\s+/g, ""))) {
	  errors.phone = "Numer telefonu powinien zawierac 9-15 cyfr.";
	}
	if (!paymentMethod) {
	  errors.paymentMethod = "Wybierz sposob platnosci.";
	}
	if (!Number.isFinite(amount) || amount < 10) {
	  errors.amount = "Minimalna kwota to 10 PLN.";
	}
	if (!fields.consent.checked) {
	  errors.consent = "Zaznacz zgode na kontakt.";
	}

	form.querySelectorAll("[data-error-for]").forEach((node) => {
	  const key = node.getAttribute("data-error-for");
	  node.textContent = errors[key] || "";
	});

	if (Object.keys(errors).length > 0) {
	  showFormMessage(messageNode, "error", "Formularz zawiera bledy. Popraw pola i sprobuj ponownie.");
	  return;
	}

	const donation = {
	  id: `${Date.now()}`,
	  createdAt: new Date().toISOString(),
	  fullName,
	  email,
	  phone,
	  paymentMethod,
	  amount,
	  note: document.getElementById("note").value.trim(),
	  monthly: document.getElementById("monthly").checked,
	  status: "Nowa"
	};

	const current = getStoredDonations();
	current.unshift(donation);
	saveDonations(current);

	form.reset();
	showFormMessage(messageNode, "success", "Dziekujemy! Deklaracja zostala zapisana.");
  });
}

function setupAdminPanel() {
  const tableBody = document.getElementById("adminTableBody");
  if (!tableBody) {
	return;
  }

  const searchInput = document.getElementById("adminSearch");
  const statusSelect = document.getElementById("adminFilterStatus");
  const clearButton = document.getElementById("clearDonations");

  const postForm = document.getElementById("adminPostForm");
  const postMessage = document.getElementById("adminPostMessage");
  const postsList = document.getElementById("adminPostsList");

  function renderDonations() {
	const all = getStoredDonations();
	const query = searchInput.value.trim().toLowerCase();
	const status = statusSelect.value;

	const filtered = all.filter((item) => {
	  const matchesQuery = `${item.fullName} ${item.email} ${item.phone}`.toLowerCase().includes(query);
	  const matchesStatus = status === "all" || item.status === status;
	  return matchesQuery && matchesStatus;
	});

	document.getElementById("statCount").textContent = `${all.length}`;
	document.getElementById("statTotal").textContent = `${all.reduce((sum, item) => sum + Number(item.amount || 0), 0)} PLN`;
	document.getElementById("statNew").textContent = `${all.filter((item) => item.status === "Nowa").length}`;

	if (filtered.length === 0) {
	  tableBody.innerHTML = "<tr><td colspan='6'>Brak wynikow dla podanych filtrow.</td></tr>";
	  return;
	}

	tableBody.innerHTML = filtered
	  .map((item) => {
		const statusClass = item.status === "Skontaktowano" ? "done" : "new";
		const contact = item.phone ? `${escapeHtml(item.email)}<br>${escapeHtml(item.phone)}` : escapeHtml(item.email);
		const actionText = item.status === "Skontaktowano" ? "Cofnij" : "Oznacz jako skontaktowano";
		return `
		  <tr>
			<td>${formatDate(item.createdAt)}</td>
			<td><strong>${escapeHtml(item.fullName)}</strong><br>${contact}</td>
			<td>${Number(item.amount || 0)} PLN ${item.monthly ? "<br><small>(regularnie)</small>" : ""}</td>
			<td>${formatPaymentMethod(item.paymentMethod)}</td>
			<td><span class="status ${statusClass}">${item.status}</span></td>
			<td><button class="btn btn-muted" data-action="toggle" data-id="${item.id}">${actionText}</button></td>
		  </tr>
		`;
	  })
	  .join("");
  }

  function renderPosts() {
	if (!postsList) {
	  return;
	}

	const posts = getStoredPosts().sort((a, b) => new Date(b.date) - new Date(a.date));
	if (posts.length === 0) {
	  postsList.innerHTML = "<p class='empty-state'>Brak opublikowanych wpisow. Dodaj pierwszy wpis ponizej.</p>";
	  return;
	}

	postsList.innerHTML = posts
	  .map((post) => {
		const typeClass = post.type === "wydarzenie" ? "badge-event" : "badge-news";
		const typeLabel = post.type === "wydarzenie" ? "Wydarzenie" : "Aktualnosc";
		return `
		  <article class="admin-post-item">
			<div class="admin-post-head">
			  <span class="post-badge ${typeClass}">${typeLabel}</span>
			  <span class="news-date">${formatDate(post.date)}</span>
			</div>
			<h3>${escapeHtml(post.title)}</h3>
			<p>${escapeHtml(post.description)}</p>
			<div class="admin-post-actions">
			  <button type="button" class="btn btn-muted" data-action="delete-post" data-id="${post.id}">Usun</button>
			</div>
		  </article>
		`;
	  })
	  .join("");
  }

  searchInput.addEventListener("input", renderDonations);
  statusSelect.addEventListener("change", renderDonations);

  clearButton.addEventListener("click", () => {
	if (!window.confirm("Na pewno usunac wszystkie deklaracje?")) {
	  return;
	}
	saveDonations([]);
	renderDonations();
  });

  tableBody.addEventListener("click", (event) => {
	const target = event.target;
	if (!(target instanceof HTMLElement) || target.dataset.action !== "toggle") {
	  return;
	}

	const id = target.dataset.id;
	const next = getStoredDonations().map((item) => {
	  if (item.id !== id) {
		return item;
	  }
	  return {
		...item,
		status: item.status === "Nowa" ? "Skontaktowano" : "Nowa"
	  };
	});
	saveDonations(next);
	renderDonations();
  });

  if (postForm && postsList) {
	postsList.addEventListener("click", (event) => {
	  const target = event.target;
	  if (!(target instanceof HTMLElement) || target.dataset.action !== "delete-post") {
		return;
	  }
	  const id = target.dataset.id;
	  const next = getStoredPosts().filter((post) => post.id !== id);
	  savePosts(next);
	  renderPosts();
	});

	postForm.addEventListener("submit", (event) => {
	  event.preventDefault();

	  const type = document.getElementById("postType").value;
	  const title = document.getElementById("postTitle").value.trim();
	  const date = document.getElementById("postDate").value;
	  const description = document.getElementById("postDescription").value.trim();
	  const image = document.getElementById("postImage").value.trim();

	  const errors = {};
	  if (!type) {
		errors.postType = "Wybierz typ wpisu.";
	  }
	  if (title.length < 4) {
		errors.postTitle = "Tytul powinien miec min. 4 znaki.";
	  }
	  if (!date) {
		errors.postDate = "Wybierz date wydarzenia/aktualnosci.";
	  }
	  if (description.length < 10) {
		errors.postDescription = "Opis powinien miec min. 10 znakow.";
	  }
	  if (image && !/^public\/.+\.(jpg|jpeg|png|webp)$/i.test(image)) {
		errors.postImage = "Podaj sciezke np. public/zdjęcia/DSCF2703.jpg";
	  }

	  postForm.querySelectorAll("[data-error-for]").forEach((node) => {
		const key = node.getAttribute("data-error-for");
		node.textContent = errors[key] || "";
	  });

	  if (Object.keys(errors).length > 0) {
		showFormMessage(postMessage, "error", "Nie udalo sie dodac wpisu. Popraw pola formularza.");
		return;
	  }

	  const post = {
		id: `${Date.now()}`,
		type,
		title,
		date,
		description,
		image,
		createdAt: new Date().toISOString()
	  };

	  const next = getStoredPosts();
	  next.unshift(post);
	  savePosts(next);
	  postForm.reset();
	  showFormMessage(postMessage, "success", "Wpis zostal opublikowany.");
	  renderPosts();
	});

	renderPosts();
  }

  renderDonations();
}

function setupRecentPage() {
  const feed = document.getElementById("recentFeed");
  if (!feed) {
	return;
  }

  const posts = getStoredPosts().sort((a, b) => {
	const byDate = new Date(b.date) - new Date(a.date);
	return byDate !== 0 ? byDate : new Date(b.createdAt) - new Date(a.createdAt);
  });

  if (posts.length === 0) {
	feed.innerHTML = "<p class='empty-state'>Brak nowych wpisow dodanych przez panel admina.</p>";
	return;
  }

  feed.innerHTML = posts
	.map((post) => {
	  const typeClass = post.type === "wydarzenie" ? "badge-event" : "badge-news";
	  const typeLabel = post.type === "wydarzenie" ? "Wydarzenie" : "Aktualnosc";
	  const imageMarkup = post.image
		? `<img class="news-thumb" src="${escapeHtml(post.image)}" alt="${escapeHtml(post.title)}">`
		: "";
	  return `
		<article class="news-item">
		  <div class="admin-post-head">
			<span class="post-badge ${typeClass}">${typeLabel}</span>
			<span class="news-date">${formatDate(post.date)}</span>
		  </div>
		  <div class="news-layout ${post.image ? "" : "news-layout-no-image"}">
			${imageMarkup}
			<div>
			  <h3>${escapeHtml(post.title)}</h3>
			  <p>${escapeHtml(post.description)}</p>
			</div>
		  </div>
		</article>
	  `;
	})
	.join("");
}

setupDonationForm();
setupAdminPanel();
setupRecentPage();
