import { firebaseConfig } from "./firebase-config.js";

// Unregister any existing service workers
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => {
      const hadController = !!navigator.serviceWorker.controller;
      return Promise.all(registrations.map((registration) => registration.unregister()))
        .then(() => {
          if (hadController && !sessionStorage.getItem('swReloaded')) {
            sessionStorage.setItem('swReloaded', '1');
            window.location.reload();
          }
        });
    })
    .catch((err) => console.warn('Service worker unregister failed:', err));
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  defaultState,
  loadUserState,
  saveUserState,
} from "./state-persistence.js";

document.addEventListener("DOMContentLoaded", () => {
  // ── DOM Elements (Shared) ────────────────────────────────────────────────
  const welcomeScreen = document.getElementById("welcome-screen");
  const authHint = document.getElementById("auth-hint");
  const signInBtn = document.getElementById("sign-in-btn");
  const welcomeSignInBtn = document.getElementById("welcome-sign-in-btn");
  const signOutBtn = document.getElementById("sign-out-btn");
  const appEl = document.getElementById("app");
  const syncHint = document.getElementById("sync-hint");
  const loadingScreen = document.getElementById("loading-screen");

  // ── DOM Elements (Dashboard View) ────────────────────────────────────────
  const viewDashboard = document.getElementById("view-dashboard");
  const groupsContainer = document.getElementById("groups-container");

  // ── DOM Elements (Group View) ────────────────────────────────────────────
  const viewGroup = document.getElementById("view-group");
  const groupTitleEl = document.getElementById("group-title");
  const groupDescriptionEl = document.getElementById("group-description");
  const groupCreatedEl = document.getElementById("group-created");
  const statTotal = document.getElementById("group-stat-total");
  const statWeek = document.getElementById("group-stat-week");
  const statMonth = document.getElementById("group-stat-month");
  const statCards = document.getElementById("group-stat-cards");
  const statEntries = document.getElementById("group-stat-entries");
  const groupLayoutSelect = document.getElementById("group-layout-select");
  const groupSortSelect = document.getElementById("group-sort-select");
  const cardsContainer = document.getElementById("cards-container");
  const groupCoverPhoto = document.getElementById("group-cover-photo");
  const editGroupBtn = document.getElementById("edit-group-btn");
  const backToDashboardBtn = document.getElementById("back-to-dashboard-btn");

  // ── DOM Elements (Modals & Forms) ────────────────────────────────────────
  const groupTitleInput = document.getElementById("group-title-input");
  const groupDescriptionInput = document.getElementById("group-description-input");
  const createGroupBtn = document.getElementById("create-group-btn");
  const openCreateGroupModalBtn = document.getElementById("open-create-group-modal-btn");
  const closeCreateGroupModalBtn = document.getElementById("close-create-group-modal-btn");
  const createGroupModal = document.getElementById("create-group-modal");
  
  const cardGroupSelect = document.getElementById("card-group-select");
  const cardTitleInput = document.getElementById("card-title-input");
  const cardTypeInput = document.getElementById("card-type-input");
  const cardDescriptionInput = document.getElementById("card-description-input");
  const cardImageInput = document.getElementById("card-image-input");
  const cardImagePreview = document.getElementById("card-image-preview");
  let cardImageData = "";
  const cardClickLimitInput = document.getElementById("card-click-limit-input");
  const createCardBtn = document.getElementById("create-card-btn");
  const openCreateCardModalBtn = document.getElementById("open-create-card-modal-btn");
  const closeCreateCardModalBtn = document.getElementById("close-create-card-modal-btn");
  const createCardModal = document.getElementById("create-card-modal");
  const createCardAssignedGroupLabel = document.getElementById("create-card-assigned-group");
  
  const addButtonModal = document.getElementById("add-button-modal");
  const openAddButtonModalBtn = document.getElementById("open-add-button-modal-btn");
  const buttonLinkGroup = document.getElementById("button-link-group");
  const buttonImageGroup = document.getElementById("button-image-group");
  const addButtonBtn = document.getElementById("add-button-btn");
  const buttonNameInput = document.getElementById("button-name-input");
  const buttonTypeInput = document.getElementById("button-type-input");
  const buttonValueInput = document.getElementById("button-value-input");
  const buttonImageInput = document.getElementById("button-image-input");
  const buttonImagePreview = document.getElementById("button-image-preview");
  let buttonImageData = "";
  const buttonDraftList = document.getElementById("button-draft-list");

  const editGroupModal = document.getElementById("edit-group-modal");
  const closeEditGroupModalBtn = document.getElementById("close-edit-group-modal-btn");
  const editGroupTitleInput = document.getElementById("edit-group-title-input");
  const editGroupDescriptionInput = document.getElementById("edit-group-description-input");
  const editGroupCoverInput = document.getElementById("edit-group-cover-input");
  const editGroupCoverPreview = document.getElementById("edit-group-cover-preview");
  const editGroupClickLimitInput = document.getElementById("edit-group-click-limit-input");
  const saveEditGroupBtn = document.getElementById("save-edit-group-btn");
  let editGroupCoverData = "";

  const editCardModal = document.getElementById("edit-card-modal");
  const closeEditCardModalBtn = document.getElementById("close-edit-card-modal-btn");
  const addEditButtonModal = document.getElementById("add-edit-button-modal");
  const openAddEditButtonModalBtn = document.getElementById("open-add-edit-button-modal-btn");
  const editButtonLinkGroup = document.getElementById("edit-button-link-group");
  const editButtonImageGroup = document.getElementById("edit-button-image-group");
  const editCardGroupSelect = document.getElementById("edit-card-group-select");
  const editCardTotalClicks = document.getElementById("edit-card-total-clicks");
  const editCardWeekClicks = document.getElementById("edit-card-week-clicks");
  const editCardMonthClicks = document.getElementById("edit-card-month-clicks");
  const editCardCreated = document.getElementById("edit-card-created");
  const editCardButtonStats = document.getElementById("edit-card-button-stats");
  const editCardClicksRow = document.getElementById("edit-card-clicks-row");
  const editCardWeekRow = document.getElementById("edit-card-week-row");
  const editCardMonthRow = document.getElementById("edit-card-month-row");
  const editCardEntriesRow = document.getElementById("edit-card-entries-row");
  const editCardEntriesCount = document.getElementById("edit-card-entries-count");
  const editCardTitleInput = document.getElementById("edit-card-title-input");
  const editCardTypeInput = document.getElementById("edit-card-type-input");
  const editCardDescriptionInput = document.getElementById("edit-card-description-input");
  const editCardImageInput = document.getElementById("edit-card-image-input");
  const editCardImagePreview = document.getElementById("edit-card-image-preview");
  let editCardImageData = "";
  const editCardClickLimitInput = document.getElementById("edit-card-click-limit-input");
  const addEditButtonBtn = document.getElementById("add-edit-button-btn");
  const editButtonNameInput = document.getElementById("edit-button-name-input");
  const editButtonTypeInput = document.getElementById("edit-button-type-input");
  const editButtonValueInput = document.getElementById("edit-button-value-input");
  const editButtonImageInput = document.getElementById("edit-button-image-input");
  const editButtonImagePreview = document.getElementById("edit-button-image-preview");
  let editButtonImageData = "";
  const editButtonDraftList = document.getElementById("edit-button-draft-list");
  const saveEditCardBtn = document.getElementById("save-edit-card-btn");

  const entryModal = document.getElementById("entry-modal");
  const entryModalTitle = document.getElementById("entry-modal-title");
  const closeEntryModalBtn = document.getElementById("close-entry-modal-btn");
  const entrySearchInput = document.getElementById("entry-search-input");
  const entrySortSelect = document.getElementById("entry-sort-select");
  const copyAllEntriesBtn = document.getElementById("copy-all-entries-btn");
  const entryNewLabelInput = document.getElementById("entry-new-label-input");
  const entryList = document.getElementById("entry-list");

  const descriptionModal = document.getElementById("description-modal");
  const descriptionModalTitle = document.getElementById("description-modal-title");
  const closeDescriptionModalBtn = document.getElementById("close-description-modal-btn");
  const entryNameInput = document.getElementById("edit-entry-label-input");
  const entryNumberInput = document.getElementById("edit-entry-position-input");
  const entryDescriptionInput = document.getElementById("entry-description-input");
  const saveEntryDescriptionBtn = document.getElementById("save-entry-description-btn");
  const entryButtonStats = document.getElementById("entry-button-stats");

  const imageModal = document.getElementById("image-modal");
  const fullscreenImage = document.getElementById("fullscreen-image");

  const cardContextMenu = document.getElementById("card-context-menu");
  const contextEditCardBtn = document.getElementById("context-edit-card");
  const contextDeleteCardBtn = document.getElementById("context-delete-card");

  const groupContextMenu = document.getElementById("group-context-menu");
  const contextEditGroupBtn = document.getElementById("context-edit-group");
  const contextDeleteGroupBtn = document.getElementById("context-delete-group");

  // ── State Variables ──────────────────────────────────────────────────────
  let auth = null;
  let db = null;
  let currentUserId = null;
  let isAppInitialized = false;
  let draftButtons = [];
  let editDraftButtons = [];
  let activeCardIdForEdit = null;
  let activeCardIdForEntries = null;
  let activeEntryIdForDescription = null;
  let activeGroupIdForEdit = null;
  let activeGroupIdForContext = null;
  let activeCardIdForContext = null;
  let longPressTimer = null;

  let state = defaultState();
  let syncHintTimer = null;
  let currentView = "dashboard"; // 'dashboard' or 'group'
  let currentGroupId = null;

  // Search State
  const searchBar = document.getElementById("search-bar");
  const searchInput = document.getElementById("search-input");
  const clearSearchBtn = document.getElementById("clear-search-btn");
  let currentSearchQuery = "";

  function uid(prefix = "id") {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }

  function nowIso() {
    return new Date().toISOString();
  }

  // ── Firebase Init ────────────────────────────────────────────────────────
  try {
    const firebaseApp = initializeApp(firebaseConfig);
    auth = getAuth(firebaseApp);
    db = getFirestore(firebaseApp);
  } catch (err) {
    authHint.textContent =
      "Firebase isn't configured yet. Paste your Firebase config into firebase-config.js to enable Google login.";
    authHint.style.color = "#b45309";
  }

  function showSyncWarning(message) {
    if (!message) return;
    if (syncHint) {
      syncHint.textContent = message;
      syncHint.classList.remove("hidden");
      clearTimeout(syncHintTimer);
      syncHintTimer = setTimeout(() => syncHint.classList.add("hidden"), 15000);
    } else {
      console.warn(message);
    }
  }

  async function loadStateFromFirestore() {
    const result = await loadUserState(db, currentUserId);
    state = result.state;
    if (result.shouldSyncToFirestore) {
      const saveResult = await saveUserState(db, currentUserId, state);
      state = saveResult.state;
      if (saveResult.error) showSyncWarning(saveResult.error);
    } else if (result.source === "localStorage") {
      showSyncWarning("Loaded your saved data from this device.");
    }
    return result;
  }

  async function saveStateToFirestore() {
    if (!currentUserId) return { firestoreOk: false };
    const result = await saveUserState(db, currentUserId, state);
    state = result.state;
    if (result.error) showSyncWarning(result.error);
    return result;
  }

  // ── UI State Management ──────────────────────────────────────────────────
  function setLoadingUI() {
    welcomeScreen.classList.add("hidden");
    appEl.classList.add("hidden");
    if (signInBtn) signInBtn.classList.add("hidden");
    if (searchBar) searchBar.classList.add("hidden");
    if (loadingScreen) loadingScreen.classList.remove("hidden");
  }

  function setSignedOutUI() {
    if (loadingScreen) loadingScreen.classList.add("hidden");
    welcomeScreen.classList.remove("hidden");
    appEl.classList.add("hidden");
    if (signInBtn) signInBtn.classList.remove("hidden");
    if (searchBar) searchBar.classList.add("hidden");
  }

  function setSignedInUI(user) {
    if (loadingScreen) loadingScreen.classList.add("hidden");
    welcomeScreen.classList.add("hidden");
    appEl.classList.remove("hidden");
    if (signInBtn) signInBtn.classList.add("hidden");
    if (searchBar) searchBar.classList.remove("hidden");
  }

  // ── View Switching (SPA Logic) ───────────────────────────────────────────
  function showDashboardView() {
    currentView = "dashboard";
    currentGroupId = null;
    sessionStorage.removeItem("lastGroupId");
    
    viewDashboard.classList.remove("hidden");
    viewGroup.classList.add("hidden");
    document.title = "Infave";
    
    renderAll();
  }

  function showGroupView(groupId) {
    if (!groupId) return;
    currentView = "group";
    currentGroupId = groupId;
    sessionStorage.setItem("lastGroupId", groupId);
    
    viewDashboard.classList.add("hidden");
    viewGroup.classList.remove("hidden");
    
    renderGroupPage();
  }

  async function openGroupPage(group) {
    if (!group?.id) return;
    await saveStateToFirestore();
    showGroupView(group.id);
  }

  function renderCurrentView() {
    if (currentView === "group" && currentGroupId) {
      renderGroupPage();
    } else {
      renderGroups();
    }
  }

  // ── Search Logic ─────────────────────────────────────────────────────────
  function performSearch(query) {
    currentSearchQuery = query.toLowerCase().trim();
    if (currentView === "group") {
      renderGroupPage();
    } else {
      if (currentSearchQuery) {
        renderSearchResults();
      } else {
        renderGroups();
      }
    }
  }

  function cardMatchesSearch(card, query) {
    if (!query) return true;
    const searchTerms = query.toLowerCase().split(/\s+/);
    const cardName = (card.title || "").toLowerCase();
    const cardClicks = String(card.clicks || 0);
    const entryCount = String((card.entries || []).length);
    const buttonNames = (card.buttons || []).map(b => (b.name || "").toLowerCase()).join(" ");
    const buttonClicks = (card.buttons || []).map(b => String(b.clickCount || 0)).join(" ");
    
    const cardMatches = searchTerms.every(term =>
      cardName.includes(term) ||
      cardClicks === term ||
      entryCount === term ||
      buttonNames.includes(term) ||
      buttonClicks === term
    );
    
    if (cardMatches) return true;
    
    if (card.entries && card.entries.length > 0) {
      return card.entries.some(entry => {
        const entryLabel = (entry.label || "").toLowerCase();
        const entryDesc = (entry.description || "").toLowerCase();
        return searchTerms.some(term => entryLabel.includes(term) || entryDesc.includes(term));
      });
    }
    return false;
  }

  function renderSearchResults() {
    groupsContainer.innerHTML = "";
    const matchingCards = state.cards.filter(card => cardMatchesSearch(card, currentSearchQuery));
    if (matchingCards.length === 0) {
      groupsContainer.innerHTML = `<p class="muted">No cards found matching "${escapeHtml(currentSearchQuery)}".</p>`;
      return;
    }
    const cardsGrid = document.createElement("div");
    cardsGrid.className = "cards-grid layout-3";
    matchingCards.forEach((card) => cardsGrid.appendChild(renderCard(card)));
    groupsContainer.appendChild(cardsGrid);
  }

  // ── App Initialization ───────────────────────────────────────────────────
  function initAppOnce() {
    if (isAppInitialized) return;
    isAppInitialized = true;

    // Global Listeners
    createGroupBtn.addEventListener("click", createGroup);
    openCreateGroupModalBtn.addEventListener("click", () => createGroupModal.classList.remove("hidden"));
    closeCreateGroupModalBtn.addEventListener("click", () => createGroupModal.classList.add("hidden"));
    createGroupModal.addEventListener("click", (e) => { if (e.target === createGroupModal) createGroupModal.classList.add("hidden"); });

    addButtonBtn.addEventListener("click", () => { addDraftButton(); addButtonModal.classList.add("hidden"); });
    openAddButtonModalBtn.addEventListener("click", () => {
      buttonNameInput.value = ""; buttonTypeInput.value = "label"; buttonValueInput.value = "";
      buttonImageData = ""; buttonImageInput.value = ""; buttonImagePreview.innerHTML = "";
      buttonLinkGroup.style.display = "block"; buttonImageGroup.style.display = "none";
      addButtonModal.classList.remove("hidden");
    });
    addButtonModal.addEventListener("click", (e) => { if (e.target === addButtonModal) addButtonModal.classList.add("hidden"); });
    buttonTypeInput.addEventListener("change", () => {
      if (buttonTypeInput.value === "image") { buttonLinkGroup.style.display = "none"; buttonImageGroup.style.display = "block"; } 
      else if (buttonTypeInput.value === "link") { buttonLinkGroup.style.display = "block"; buttonImageGroup.style.display = "none"; } 
      else { buttonLinkGroup.style.display = "none"; buttonImageGroup.style.display = "none"; }
    });
    buttonImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        buttonImageData = ev.target.result;
        buttonImagePreview.innerHTML = `<img src="${buttonImageData}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    });

    createCardBtn.addEventListener("click", createCard);
    openCreateCardModalBtn.addEventListener("click", () => {
      updateCreateCardLimitLabel();
      renderGroupOptions();
      if (currentView === "group" && currentGroupId) {
        if (cardGroupSelect) cardGroupSelect.value = currentGroupId;
        if (createCardAssignedGroupLabel) {
          const group = getGroup(currentGroupId);
          createCardAssignedGroupLabel.textContent = group ? `This card will be added to: ${group.title}` : "";
          createCardAssignedGroupLabel.classList.remove("hidden");
        }
      } else {
        if (cardGroupSelect) cardGroupSelect.value = "";
        if (createCardAssignedGroupLabel) {
          createCardAssignedGroupLabel.textContent = "";
          createCardAssignedGroupLabel.classList.add("hidden");
        }
      }
      createCardModal.classList.remove("hidden");
    });
    closeCreateCardModalBtn.addEventListener("click", () => createCardModal.classList.add("hidden"));
    createCardModal.addEventListener("click", (e) => { if (e.target === createCardModal) createCardModal.classList.add("hidden"); });
    cardTypeInput.addEventListener("change", updateCreateCardLimitLabel);
    cardImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        cardImageData = ev.target.result;
        if (cardImagePreview) cardImagePreview.innerHTML = `<img src="${cardImageData}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    });

    addEditButtonBtn.addEventListener("click", () => { addEditDraftButton(); addEditButtonModal.classList.add("hidden"); });
    openAddEditButtonModalBtn.addEventListener("click", () => {
      editButtonNameInput.value = ""; editButtonTypeInput.value = "label"; editButtonValueInput.value = "";
      editButtonImageData = ""; editButtonImageInput.value = ""; editButtonImagePreview.innerHTML = "";
      editButtonLinkGroup.style.display = "block"; editButtonImageGroup.style.display = "none";
      addEditButtonModal.classList.remove("hidden");
    });
    addEditButtonModal.addEventListener("click", (e) => { if (e.target === addEditButtonModal) addEditButtonModal.classList.add("hidden"); });
    editButtonTypeInput.addEventListener("change", () => {
      if (editButtonTypeInput.value === "image") { editButtonLinkGroup.style.display = "none"; editButtonImageGroup.style.display = "block"; } 
      else if (editButtonTypeInput.value === "link") { editButtonLinkGroup.style.display = "block"; editButtonImageGroup.style.display = "none"; } 
      else { editButtonLinkGroup.style.display = "none"; editButtonImageGroup.style.display = "none"; }
    });
    editButtonImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editButtonImageData = ev.target.result;
        editButtonImagePreview.innerHTML = `<img src="${editButtonImageData}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    });
    editCardImageInput.addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editCardImageData = ev.target.result;
        if (editCardImagePreview) editCardImagePreview.innerHTML = `<img src="${editCardImageData}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    });

    closeEditCardModalBtn.addEventListener("click", closeEditCardModal);
    saveEditCardBtn.addEventListener("click", saveEditedCard);
    editCardModal.addEventListener("click", (e) => { if (e.target === editCardModal) closeEditCardModal(); });

    closeEditGroupModalBtn.addEventListener("click", closeEditGroupModal);
    saveEditGroupBtn.addEventListener("click", saveEditedGroup);
    editGroupCoverInput.addEventListener("change", (e) => {
      const file = e.target.files[0]; if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editGroupCoverData = ev.target.result;
        if (editGroupCoverPreview) editGroupCoverPreview.innerHTML = `<img src="${editGroupCoverData}" style="width:100%; height:100%; object-fit:cover;">`;
      };
      reader.readAsDataURL(file);
    });

    closeEntryModalBtn.addEventListener("click", closeEntryModal);
    copyAllEntriesBtn.addEventListener("click", copyAllEntries);
    entryNewLabelInput.addEventListener("blur", autoSaveEntryOnBlur);
    entrySearchInput.addEventListener("input", renderEntryList);
    entrySortSelect.addEventListener("change", renderEntryList);

    closeDescriptionModalBtn.addEventListener("click", () => descriptionModal.classList.add("hidden"));
    saveEntryDescriptionBtn.addEventListener("click", saveEntryDescription);
    descriptionModal.addEventListener("click", (e) => { if (e.target === descriptionModal) descriptionModal.classList.add("hidden"); });

    imageModal.addEventListener("click", (e) => { if (e.target === imageModal) imageModal.classList.add("hidden"); });

    // Context Menus
    contextEditCardBtn.addEventListener("click", () => { if (activeCardIdForContext) { cardContextMenu.classList.add("hidden"); openEditCardModal(activeCardIdForContext); activeCardIdForContext = null; } });
    contextDeleteCardBtn.addEventListener("click", () => { if (activeCardIdForContext) { cardContextMenu.classList.add("hidden"); deleteCard(activeCardIdForContext); activeCardIdForContext = null; } });
    cardContextMenu.addEventListener("click", (e) => { if (e.target === cardContextMenu) { cardContextMenu.classList.add("hidden"); activeCardIdForContext = null; } });

    contextEditGroupBtn.addEventListener("click", () => { if (activeGroupIdForContext) { groupContextMenu.classList.add("hidden"); openEditGroupModal(activeGroupIdForContext); activeGroupIdForContext = null; } });
    contextDeleteGroupBtn.addEventListener("click", () => { if (activeGroupIdForContext) { groupContextMenu.classList.add("hidden"); deleteGroup(activeGroupIdForContext); activeGroupIdForContext = null; } });
    groupContextMenu.addEventListener("click", (e) => { if (e.target === groupContextMenu) { groupContextMenu.classList.add("hidden"); activeGroupIdForContext = null; } });

    // Search Listeners
    searchInput.addEventListener("input", (e) => performSearch(e.target.value));
    clearSearchBtn.addEventListener("click", () => { searchInput.value = ""; performSearch(""); });
    const deleteCardFromEditBtn = document.getElementById("delete-card-from-edit-btn");
    if (deleteCardFromEditBtn) {
      deleteCardFromEditBtn.addEventListener("click", async () => {
        if (!activeCardIdForEdit) return;
        if (!confirm("Delete this card?")) return;
        const id = activeCardIdForEdit;
        editCardModal.classList.add("hidden");
        await deleteCard(id);
      });
    }

    const deleteGroupFromEditBtn = document.getElementById("delete-group-from-edit-btn");
    if (deleteGroupFromEditBtn) {
      deleteGroupFromEditBtn.addEventListener("click", async () => {
        const id = currentGroupId || activeGroupIdForContext;
        if (!id) return;
        if (!confirm("Delete this group?")) return;
        editGroupModal.classList.add("hidden");
        await deleteGroup(id);
        showDashboardView();
      });
    }
    // SPA Group View Listeners
    backToDashboardBtn.addEventListener("click", showDashboardView);
    editGroupBtn.addEventListener("click", () => { if (currentGroupId) openEditGroupModal(currentGroupId); });
    
    groupLayoutSelect.addEventListener("change", async () => {
      const g = getGroup(currentGroupId); if (!g) return;
      g.layout = groupLayoutSelect.value;
      await saveStateToFirestore();
      renderGroupPage();
    });
    groupSortSelect.addEventListener("change", async () => {
      const g = getGroup(currentGroupId); if (!g) return;
      g.sort = groupSortSelect.value;
      await saveStateToFirestore();
      renderGroupPage();
    });

    // Restore last viewed group if refresh occurred
    const lastGroupId = sessionStorage.getItem("lastGroupId");
    if (lastGroupId && state.groups.some(g => g.id === lastGroupId)) {
      showGroupView(lastGroupId);
    } else {
      renderAll();
    }
  }

  function updateCreateCardLimitLabel() {
    const createCardLimitLabel = document.getElementById("create-card-limit-label");
    const isDatabase = cardTypeInput.value === "database";
    if (createCardLimitLabel) createCardLimitLabel.textContent = isDatabase ? "Entry Limit (optional)" : "Click Limit (optional)";
    if (cardClickLimitInput) cardClickLimitInput.placeholder = isDatabase ? "e.g., 100 - card stops creating entries at limit" : "e.g., 100 - card becomes unclickable at limit";
  }

  // ── Render Functions ─────────────────────────────────────────────────────
  function renderAll() {
    renderGroupOptions();
    renderEditGroupOptions();
    renderDraftButtons();
    renderGroups();
  }

  function getGroup(targetId = currentGroupId) {
    return state.groups.find((g) => g.id === targetId) || null;
  }

  function renderGroups() {
    groupsContainer.innerHTML = "";
    const ungroupedCards = state.cards.filter((c) => !c.groupId);
    
    if (state.groups.length === 0 && ungroupedCards.length === 0) {
      groupsContainer.innerHTML = `<p class="muted">No groups or ungrouped cards yet. Create your first card.</p>`;
      return;
    }

    if (ungroupedCards.length > 0) {
      const cardsGrid = document.createElement("div");
      cardsGrid.className = "cards-grid layout-3";
      ungroupedCards.forEach((card) => cardsGrid.appendChild(renderCard(card)));
      groupsContainer.appendChild(cardsGrid);
    }
    
    const listEl = document.createElement("div");
    listEl.className = "cards-grid layout-3";
    const headingEl = document.createElement("h3");
    headingEl.textContent = "Groups";
    groupsContainer.appendChild(headingEl);
    
    if (state.groups.length === 0) {
      const noGroupsMsg = document.createElement("p");
      noGroupsMsg.className = "muted";
      noGroupsMsg.textContent = "No groups yet. Create one to organize cards.";
      groupsContainer.appendChild(noGroupsMsg);
    } else {
      state.groups.forEach((group) => {
        const groupCards = state.cards.filter((c) => c.groupId === group.id);
        const cardCount = groupCards.length;
        const totalClicks = groupCards.reduce((sum, c) => sum + (c.clicks || 0), 0);
        const totalEntries = groupCards.reduce((sum, c) => sum + (c.entries?.length || 0), 0);
        
        const row = document.createElement("article");
        row.className = "card group-card";
        row.setAttribute("data-group-id", group.id);
        
        const imageContent = group.coverUrl
          ? `<div class="card-image" style="background-image:url('${escapeAttribute(group.coverUrl)}')"></div>`
          : `<div class="card-image">${escapeHtml(group.title.charAt(0).toUpperCase())}</div>`;
          
        row.innerHTML = `
          ${imageContent}
          <div class="card-content">
            <div>
              <strong>${escapeHtml(group.title)}</strong>
              <p class="muted">${escapeHtml(group.description || "No description")}</p>
            </div>
            <div class="button-summary-row" style="margin-top:auto;">
              <span class="chip">Cards: ${cardCount}</span>
              <span class="chip">Total: ${totalClicks}</span>
              <span class="chip">Entries: ${totalEntries}</span>
            </div>
          </div>
        `;

        let longPressOpened = false;
        row.addEventListener("click", async (e) => {
          if (longPressOpened) { longPressOpened = false; return; }
          await openGroupPage(group);
        });

        const startLongPress = (e) => {
          if (e.target.closest("button, select, input, textarea, a")) return;
          longPressOpened = false;
          longPressTimer = setTimeout(() => {
            longPressOpened = true;
            openEditGroupModal(group.id);
          }, 500);
        };
        const cancelLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };

        row.addEventListener("mousedown", startLongPress);
        row.addEventListener("touchstart", startLongPress, { passive: true });
        row.addEventListener("mouseup", cancelLongPress);
        row.addEventListener("mouseleave", cancelLongPress);
        row.addEventListener("touchend", cancelLongPress);
        row.addEventListener("touchcancel", cancelLongPress);

        listEl.appendChild(row);
      });
    }
    groupsContainer.appendChild(listEl);
  }

  function renderGroupPage() {
    const group = getGroup();
    if (!group) { showDashboardView(); return; }

    document.title = `${group.title} — Infave`;
    groupTitleEl.textContent = group.title;
    groupDescriptionEl.textContent = group.description || "";
    
    if (groupCreatedEl && group.createdAt) groupCreatedEl.textContent = new Date(group.createdAt).toLocaleString();
    if (statCards) statCards.textContent = groupCardCount();
    if (statEntries) statEntries.textContent = groupTotalEntries();
    if (statTotal) statTotal.textContent = groupTotalClicks();
    if (statWeek) statWeek.textContent = groupClicksSince(7);
    if (statMonth) statMonth.textContent = groupClicksSince(30);
    
    if (groupCoverPhoto) {
      if (group.coverUrl) {
        groupCoverPhoto.style.backgroundImage = `url('${escapeAttribute(group.coverUrl)}')`;
        groupCoverPhoto.classList.remove("hidden");
      } else {
        groupCoverPhoto.style.backgroundImage = '';
        groupCoverPhoto.classList.add("hidden");
      }
    }
    
    groupLayoutSelect.value = group.layout || "3";
    groupSortSelect.value = group.sort || "newest";

    const groupCards = sortCards(
      state.cards.filter((c) => c.groupId === currentGroupId && cardMatchesSearch(c, currentSearchQuery)),
      group.sort
    );
    cardsContainer.className = `cards-grid layout-${group.layout || "3"}`;
    cardsContainer.innerHTML = "";
    
    if (groupCards.length === 0) {
      cardsContainer.innerHTML = `<p class="muted">No cards in this group yet.</p>`;
    } else {
      groupCards.forEach((card) => cardsContainer.appendChild(renderCard(card)));
    }
  }

  function renderCard(card) {
    const el = document.createElement("article");
    const cardType = card.cardType || "standard";
    const isDatabaseCard = cardType === "database";
    const entryCount = (card.entries || []).length;
    const isAtLimit = isDatabaseCard ? card.clickLimit && entryCount >= card.clickLimit : card.clickLimit && card.clicks >= card.clickLimit;
    const isAtGroupLimit = currentView === "group" && isGroupAtLimit();
    const isUnclickable = isAtLimit || isAtGroupLimit;

    el.className = "card" + (isUnclickable ? " card-limit-reached" : "");
    el.setAttribute("data-card-id", card.id);
    const imageContent = card.imageUrl
      ? `<div class="card-image" style="background-image:url('${escapeAttribute(card.imageUrl)}')"></div>`
      : `<div class="card-image">${escapeHtml(card.title.charAt(0).toUpperCase())}</div>`;
    const buttonChips = card.buttons.map((b) => `<span class="chip">${escapeHtml(b.name)} ${b.clickCount}</span>`).join("");
    
    const typeChip = `<span class="chip">${isDatabaseCard ? "Database" : "Standard"}</span>`;
    const mainCount = isDatabaseCard ? `Entries ${entryCount}` : `Clicks ${card.clicks}`;
    const limitIndicator = card.clickLimit ? `<span class="chip ${isAtLimit ? "limit-reached" : ""}"> ${isDatabaseCard ? entryCount : card.clicks}/${card.clickLimit}</span>` : "";
    const allClicksRow = `${typeChip}<span class="chip"> ${mainCount}</span>${limitIndicator}`;

    el.innerHTML = `
      ${imageContent}
      <div class="card-content">
        <div class="card-top">
          <strong>${escapeHtml(card.title)}</strong>
          <p class="muted"> ${escapeHtml(card.description || "No description")} ${isUnclickable ? ' <span style="color:#dc2626;font-weight:bold;">(LIMIT REACHED)</span>' : ""}</p>
        </div>
        <div class="button-summary-row">${allClicksRow}</div>
      </div>
      <div class="card-buttons-outside" data-extra-buttons="${card.id}"></div>
    `;

    const row = el.querySelector(`[data-extra-buttons="${card.id}"]`);
    card.buttons.forEach((button) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "additional-btn";
      btn.textContent = `${button.name} ${button.clickCount || 0}`;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        handleAdditionalButtonClick(card.id, button.id);
      });
      row.appendChild(btn);
    });

    let pressStartX = 0, pressStartY = 0;
    const startLongPress = (e) => {
      if (e.target.closest("button, select, input, textarea, a")) return;
      const point = e.touches ? e.touches[0] : e;
      pressStartX = point.clientX;
      pressStartY = point.clientY;
      longPressTimer = setTimeout(() => {
        openEditCardModal(card.id);      }, 550);
    };
    const cancelLongPress = () => { if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; } };
    const moveLongPress = (e) => {
      const point = e.touches ? e.touches[0] : e;
      if (Math.abs(point.clientX - pressStartX) > 10 || Math.abs(point.clientY - pressStartY) > 10) cancelLongPress();
    };

    el.addEventListener("mousedown", startLongPress);
    el.addEventListener("touchstart", startLongPress, { passive: true });
    el.addEventListener("mousemove", moveLongPress);
    el.addEventListener("touchmove", moveLongPress, { passive: true });
    el.addEventListener("mouseup", cancelLongPress);
    el.addEventListener("mouseleave", cancelLongPress);
    el.addEventListener("touchend", cancelLongPress);
    el.addEventListener("touchcancel", cancelLongPress);
    
    el.addEventListener("click", (event) => {
      if (event.target.closest("button, select, input, textarea, a")) return;
      if (isUnclickable) {
        alert(isDatabaseCard ? "This card has reached its entry limit." : "This card has reached its click limit.");
        return;
      }
      registerClick(card.id, "card", "Card");
      if (isDatabaseCard) openEntryModal(card.id);
    });

    return el;
  }

  // ── Stats & Helpers ──────────────────────────────────────────────────────
  function groupTotalClicks() { return state.cards.filter((c) => c.groupId === currentGroupId).reduce((sum, card) => sum + (card.clicks || 0) + (card.buttons || []).reduce((s, b) => s + (b.clickCount || 0), 0), 0); }
  function groupCardCount() { return state.cards.filter((c) => c.groupId === currentGroupId).length; }
  function groupTotalEntries() { return state.cards.filter((c) => c.groupId === currentGroupId && c.cardType === "database").reduce((sum, card) => sum + (card.entries || []).length, 0); }
  function groupClicksSince(days) { const threshold = Date.now() - days * 24 * 60 * 60 * 1000; return state.cards.filter((c) => c.groupId === currentGroupId).reduce((sum, card) => sum + (card.clickHistory || []).filter((item) => new Date(item.at).getTime() >= threshold).length, 0); }
  function clicksSince(card, days) { const threshold = Date.now() - days * 24 * 60 * 60 * 1000; return (card.clickHistory || []).filter((item) => new Date(item.at).getTime() >= threshold).length; }
  function isGroupAtLimit() { const group = getGroup(); if (!group || !group.clickLimit) return false; return groupTotalClicks() >= group.clickLimit; }
  function sortCards(cards, mode) { const copy = [...cards]; if (mode === "most") { copy.sort((a, b) => b.clicks - a.clicks); } else { copy.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)); } return copy; }

  // ── Groups Logic ─────────────────────────────────────────────────────────
  async function createGroup() {
    const title = groupTitleInput.value.trim() || "Untitled Group";
    const description = groupDescriptionInput.value.trim();
    state.groups.unshift({ id: uid("group"), title, description, layout: "3", sort: "newest", createdAt: nowIso() });
    groupTitleInput.value = ""; groupDescriptionInput.value = "";
    await saveStateToFirestore();
    renderAll();
    createGroupModal.classList.add("hidden");
  }

  async function deleteGroup(groupId) {
    if (!confirm("Are you sure you want to delete this group?")) return;
    state.groups = state.groups.filter((g) => g.id !== groupId);
    state.cards = state.cards.filter((c) => c.groupId !== groupId);
    await saveStateToFirestore();
    if (currentGroupId === groupId) showDashboardView();
    else renderAll();
  }

  function renderGroupOptions() {
    cardGroupSelect.innerHTML = "";
    const noneOption = document.createElement("option"); noneOption.textContent = "No group"; noneOption.value = ""; cardGroupSelect.appendChild(noneOption);
    state.groups.forEach((group) => { const option = document.createElement("option"); option.value = group.id; option.textContent = group.title; cardGroupSelect.appendChild(option); });
  }

  function openEditGroupModal(groupId) {
    const group = getGroup(groupId); if (!group) return;
    activeGroupIdForEdit = group.id;
    editGroupTitleInput.value = group.title || ""; editGroupDescriptionInput.value = group.description || ""; editGroupCoverData = group.coverUrl || ""; editGroupCoverInput.value = ""; editGroupClickLimitInput.value = group.clickLimit || "";
    if (editGroupCoverPreview) editGroupCoverPreview.innerHTML = group.coverUrl ? `<img src="${group.coverUrl}" style="width:100%; height:100%; object-fit:cover;">` : "";
    editGroupModal.classList.remove("hidden");
  }

  function closeEditGroupModal() {
    activeGroupIdForEdit = null; editGroupTitleInput.value = ""; editGroupDescriptionInput.value = ""; editGroupCoverData = ""; editGroupCoverInput.value = ""; editGroupClickLimitInput.value = "";
    if (editGroupCoverPreview) editGroupCoverPreview.innerHTML = "";
    editGroupModal.classList.add("hidden");
  }

  async function saveEditedGroup() {
    const group = state.groups.find((g) => g.id === activeGroupIdForEdit); if (!group) return;
    const title = editGroupTitleInput.value.trim(); if (!title) { alert("Group title is required."); return; }
    const clickLimitValue = editGroupClickLimitInput.value.trim();
    group.title = title; group.description = editGroupDescriptionInput.value.trim(); group.coverUrl = editGroupCoverData || group.coverUrl; group.clickLimit = clickLimitValue ? parseInt(clickLimitValue, 10) : null; group.updatedAt = nowIso();
    await saveStateToFirestore(); renderCurrentView(); closeEditGroupModal();
  }

  // ── Cards Logic ──────────────────────────────────────────────────────────
  function renderEditGroupOptions(selectedGroupId = "") {
    editCardGroupSelect.innerHTML = "";
    const noneOption = document.createElement("option"); noneOption.textContent = "No group"; noneOption.value = ""; if (!selectedGroupId) noneOption.selected = true; editCardGroupSelect.appendChild(noneOption);
    state.groups.forEach((group) => { const option = document.createElement("option"); option.value = group.id; option.textContent = group.title; if (group.id === selectedGroupId) option.selected = true; editCardGroupSelect.appendChild(option); });
  }

  async function createCard() {
    const groupId = currentView === "group" ? currentGroupId : (cardGroupSelect ? cardGroupSelect.value : null);
    const title = cardTitleInput.value.trim(); if (!title) { alert("Card title is required."); return; }
    const clickLimitValue = cardClickLimitInput.value.trim();
    state.cards.unshift({ id: uid("card"), groupId: groupId || null, title, cardType: cardTypeInput.value, description: cardDescriptionInput.value.trim(), imageUrl: cardImageData, clickLimit: clickLimitValue ? parseInt(clickLimitValue, 10) : null, createdAt: nowIso(), updatedAt: nowIso(), clicks: 0, clickHistory: [], buttons: draftButtons, entries: [] });
    draftButtons = []; cardTitleInput.value = ""; cardTypeInput.value = "standard"; cardDescriptionInput.value = ""; cardImageInput.value = ""; cardImageData = ""; cardClickLimitInput.value = "";
    if (cardImagePreview) cardImagePreview.innerHTML = "";
    await saveStateToFirestore(); renderCurrentView(); createCardModal.classList.add("hidden");
  }

  async function deleteCard(cardId) { state.cards = state.cards.filter((c) => c.id !== cardId); await saveStateToFirestore(); renderCurrentView(); }

  function openEditCardModal(cardId) {
    const card = state.cards.find((c) => c.id === cardId); if (!card) return;
    activeCardIdForEdit = card.id; editCardImageData = "";
    renderEditGroupOptions(card.groupId);
    editCardTitleInput.value = card.title || ""; editCardTypeInput.value = card.cardType || "standard"; editCardTypeInput.disabled = true; editCardDescriptionInput.value = card.description || ""; editCardClickLimitInput.value = card.clickLimit || "";
    const isDatabaseCard = card.cardType === "database";
    const editCardLimitLabel = document.getElementById("edit-card-limit-label");
    if (editCardLimitLabel) editCardLimitLabel.textContent = isDatabaseCard ? "Entry Limit (optional)" : "Click Limit (optional)";
    if (editCardImagePreview) editCardImagePreview.innerHTML = card.imageUrl ? `<img src="${card.imageUrl}" style="width:100%; height:100%; object-fit:cover;">` : "";
    const totalClicks = (card.clicks || 0) + (card.buttons || []).reduce((sum, b) => sum + (b.clickCount || 0), 0);
    const entryCount = (card.entries || []).length;
    if (editCardClicksRow) editCardClicksRow.style.display = isDatabaseCard ? "none" : "inline";
    if (editCardWeekRow) editCardWeekRow.style.display = isDatabaseCard ? "none" : "inline";
    if (editCardMonthRow) editCardMonthRow.style.display = isDatabaseCard ? "none" : "inline";
    if (editCardEntriesRow) editCardEntriesRow.style.display = isDatabaseCard ? "inline" : "none";
    if (editCardTotalClicks) editCardTotalClicks.textContent = isDatabaseCard ? entryCount.toString() + " entries" : totalClicks.toString();
    if (editCardWeekClicks) editCardWeekClicks.textContent = clicksSince(card, 7).toString();
    if (editCardMonthClicks) editCardMonthClicks.textContent = clicksSince(card, 30).toString();
    if (editCardEntriesCount) editCardEntriesCount.textContent = entryCount.toString();
    if (editCardCreated && card.createdAt) editCardCreated.textContent = new Date(card.createdAt).toLocaleString();
    if (editCardButtonStats) editCardButtonStats.innerHTML = (card.buttons || []).map((b) => `<span class="chip" style="background:#e0e7ff; color:#3730a3;">${escapeHtml(b.name)}: ${b.clickCount || 0}</span>`).join("") || '<span class="muted">No buttons</span>';
    editDraftButtons = (card.buttons || []).map((button) => ({ id: button.id || uid("btn"), name: button.name || "", type: button.type || "label", value: button.value || "", clickCount: Number(button.clickCount || 0) }));
    editButtonNameInput.value = ""; editButtonTypeInput.value = "label"; editButtonValueInput.value = "";
    renderEditDraftButtons();
    editCardModal.classList.remove("hidden");
  }

  function closeEditCardModal() { activeCardIdForEdit = null; editDraftButtons = []; editCardImageData = ""; if (editCardImagePreview) editCardImagePreview.innerHTML = ""; editButtonNameInput.value = ""; editButtonTypeInput.value = "label"; editButtonValueInput.value = ""; editCardModal.classList.add("hidden"); }

  async function saveEditedCard() {
    const card = state.cards.find((c) => c.id === activeCardIdForEdit); if (!card) return;
    const groupId = editCardGroupSelect.value; const title = editCardTitleInput.value.trim(); if (!title) { alert("Card title is required."); return; }
    const clickLimitValue = editCardClickLimitInput.value.trim();
    card.groupId = groupId || null; card.title = title; card.cardType = editCardTypeInput.value; card.description = editCardDescriptionInput.value.trim(); card.imageUrl = editCardImageData || card.imageUrl; card.clickLimit = clickLimitValue ? parseInt(clickLimitValue, 10) : null; card.buttons = editDraftButtons.map((button) => ({ ...button })); card.updatedAt = nowIso();
    await saveStateToFirestore(); renderCurrentView(); closeEditCardModal();
  }

  // ── Draft Buttons Logic ──────────────────────────────────────────────────
  function addDraftButton() {
    const name = buttonNameInput.value.trim(); const type = buttonTypeInput.value; const value = buttonValueInput.value.trim();
    if (!name) { alert("Button name is required."); return; }
    if (type === "link" && !value) { alert("Please add a URL value for link button."); return; }
    if (type === "image" && !buttonImageData) { alert("Please upload an image for the image button."); return; }
    draftButtons.push({ id: uid("btn"), name, type, value: type === "image" ? buttonImageData : value, clickCount: 0 });
    buttonTypeInput.value = "label"; buttonValueInput.style.display = "block"; buttonImageInput.style.display = "none"; buttonImagePreview.style.display = "none"; buttonImageData = ""; buttonImageInput.value = ""; buttonImagePreview.innerHTML = ""; buttonNameInput.value = ""; buttonValueInput.value = "";
    renderDraftButtons();
  }
  function removeDraftButton(buttonId) { draftButtons = draftButtons.filter((x) => x.id !== buttonId); renderDraftButtons(); }
  function renderDraftButtons() {
    buttonDraftList.innerHTML = "";
    draftButtons.forEach((btn) => {
      const li = document.createElement("li"); li.className = "chip-row";
      li.innerHTML = `<span class="chip">${escapeHtml(btn.name)} (${escapeHtml(btn.type)})</span><button class="inline-btn danger-btn" data-remove-draft-id="${btn.id}" type="button">Remove</button>`;
      buttonDraftList.appendChild(li);
    });
    buttonDraftList.querySelectorAll("[data-remove-draft-id]").forEach((el) => el.addEventListener("click", () => removeDraftButton(el.getAttribute("data-remove-draft-id"))));
  }
  function addEditDraftButton() {
    const name = editButtonNameInput.value.trim(); const type = editButtonTypeInput.value; const value = editButtonValueInput.value.trim();
    if (!name) { alert("Button name is required."); return; }
    if (editDraftButtons.some((b) => b.name.toLowerCase() === name.toLowerCase())) { alert("A button with this name already exists on this card."); return; }
    if (type === "link" && !value) { alert("Please add a URL value for link button."); return; }
    if (type === "image" && !editButtonImageData) { alert("Please upload an image for the image button."); return; }
    editDraftButtons.push({ id: uid("btn"), name, type, value: type === "image" ? editButtonImageData : value, clickCount: 0 });
    editButtonTypeInput.value = "label"; editButtonValueInput.style.display = "block"; editButtonImageInput.style.display = "none"; editButtonImagePreview.style.display = "none"; editButtonImageData = ""; editButtonImageInput.value = ""; editButtonImagePreview.innerHTML = ""; editButtonNameInput.value = ""; editButtonValueInput.value = "";
    renderEditDraftButtons();
  }
  function removeEditDraftButton(buttonId) { editDraftButtons = editDraftButtons.filter((x) => x.id !== buttonId); renderEditDraftButtons(); }
  function renderEditDraftButtons() {
    editButtonDraftList.innerHTML = "";
    editDraftButtons.forEach((btn) => {
      const li = document.createElement("li"); li.className = "chip-row";
      li.innerHTML = `<span class="chip">${escapeHtml(btn.name)} (${escapeHtml(btn.type)})</span><button class="inline-btn danger-btn" data-remove-edit-draft-id="${btn.id}" type="button">Remove</button>`;
      editButtonDraftList.appendChild(li);
    });
    editButtonDraftList.querySelectorAll("[data-remove-edit-draft-id]").forEach((el) => el.addEventListener("click", () => removeEditDraftButton(el.getAttribute("data-remove-edit-draft-id"))));
  }

  // ── Click Tracking ───────────────────────────────────────────────────────
  async function registerClick(cardId, sourceType, sourceName) {
    const card = state.cards.find((c) => c.id === cardId); if (!card) return;
    if (sourceType === "card") card.clicks += 1;
    card.updatedAt = nowIso(); card.clickHistory.unshift({ at: nowIso(), sourceType, sourceName });
    renderCurrentView();
    if (activeCardIdForEntries === cardId) renderEntryList();
    await saveStateToFirestore();
  }

  function handleAdditionalButtonClick(cardId, buttonId) {
    const card = state.cards.find((c) => c.id === cardId); if (!card) return;
    const button = card.buttons.find((b) => b.id === buttonId); if (!button) return;
    button.clickCount += 1; card.updatedAt = nowIso();
    card.clickHistory.unshift({ at: nowIso(), sourceType: "button", sourceName: button.name });
    renderCurrentView();
    saveStateToFirestore();
    if (button.type === "link" && button.value) window.open(button.value, "_blank", "noopener,noreferrer");
    if (button.type === "image" && button.value) { fullscreenImage.src = button.value; imageModal.classList.remove("hidden"); }
}
  // ── Entries Logic ────────────────────────────────────────────────────────
  function openEntryModal(cardId) { activeCardIdForEntries = cardId; const card = state.cards.find((c) => c.id === cardId); if (!card) return; entryModalTitle.textContent = card.title; entrySearchInput.value = ""; entryNewLabelInput.value = ""; entryModal.classList.remove("hidden"); renderEntryList(); }
  function closeEntryModal() { autoSaveEntryOnBlur(); entryModal.classList.add("hidden"); activeCardIdForEntries = null; entryList.innerHTML = ""; }
  async function autoSaveEntryOnBlur() {
    if (!activeCardIdForEntries) return;
    const label = entryNewLabelInput.value.trim();
    if (!label) return;
    const card = state.cards.find((c) => c.id === activeCardIdForEntries);
    if (!card) return;
    if (card.clickLimit && (card.entries || []).length >= card.clickLimit) {
      alert("This card has reached its entry limit.");
      return;
    }
    const nextNumber = card.entries.length > 0
      ? Math.max(...card.entries.map((e) => e.number || 0)) + 1
      : 1;
    const defaultBtns = (card.defaultEntryButtons || []).map((b) => ({
      id: uid("entry-btn"),
      name: b.name,
      clickCount: 0
    }));
    card.entries.unshift({
      id: uid("entry"),
      number: nextNumber,
      label,
      createdAt: nowIso(),
      description: "",
      buttons: defaultBtns
    });
    card.updatedAt = nowIso();
    entryNewLabelInput.value = "";
    await saveStateToFirestore();
    renderEntryList();
    renderCurrentView();
  }
  function getSortedEntries(card) { const hasSortOrder = card.entries.some(e => e.sortOrder !== undefined); return hasSortOrder ? [...card.entries].sort((a, b) => (a.sortOrder ?? Infinity) - (b.sortOrder ?? Infinity) || new Date(a.createdAt) - new Date(b.createdAt)) : [...card.entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); }
  function buildEntryNumberMap(card) {
    const map = new Map();
    (card.entries || []).forEach((e) => {
      map.set(e.id, e.number || 0);
    });
    return map;
  }
  function renderEntryList() {
    if (!activeCardIdForEntries) return;
    const card = state.cards.find((c) => c.id === activeCardIdForEntries);
    if (!card) return;
    let entries = [...(card.entries || [])];
    const q = (entrySearchInput.value || "").trim().toLowerCase();
    if (q) entries = entries.filter((e) => (e.label || "").toLowerCase().includes(q));
    const sort = entrySortSelect.value;
    if (sort === "newest") entries.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sort === "oldest") entries.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sort === "most-clicks") {
      entries.sort((a, b) =>
        ((b.buttons || []).reduce((s, x) => s + (x.clickCount || 0), 0)) -
        ((a.buttons || []).reduce((s, x) => s + (x.clickCount || 0), 0))
      );
    } else {
      entries = getSortedEntries({ ...card, entries });
    }
    entryList.innerHTML = "";
    if (entries.length === 0) {
      entryList.innerHTML = `<p class="muted">No entries found.</p>`;
      return;
    }

    entries.forEach((entry) => {
      const displayNum = entry.number || 0;
      const entryButtonsHtml = (entry.buttons || []).map((b, idx) =>
        `<button class="entry-swipe-btn" data-entry-btn="\( {entry.id}" data-btn-idx=" \){idx}" type="button">${escapeHtml(b.name)} ${b.clickCount || 0}</button>`
      ).join("") || `<span class="muted" style="font-size:0.7rem;padding:6px;">No buttons</span>`;

      const wrap = document.createElement("div");
      wrap.className = "entry-row-wrap";
      wrap.innerHTML =
        `<div class="entry-row-actions-behind">${entryButtonsHtml}</div>` +
        `<div class="entry-row" data-entry-id="${entry.id}">` +
          `<div class="entry-row-header">` +
            `<strong>${displayNum}. ${escapeHtml(entry.label)}</strong>` +
            `<span class="muted">${new Date(entry.createdAt).toLocaleString()}</span>` +
          `</div>` +
        `</div>`;

      const front = wrap.querySelector(".entry-row");
      let longPressTimer = null;
      let longPressed = false;
      let startX = 0;
      let currentX = 0;
      let swiping = false;
      let revealed = false;

      front.addEventListener("click", () => {
        if (longPressed || swiping) return;
        if (revealed) {
          front.style.transform = "";
          revealed = false;
          return;
        }
        openDescriptionModal(entry.id);
      });

      front.addEventListener("touchstart", (e) => {
        longPressed = false;
        swiping = false;
        startX = e.touches[0].clientX;
        currentX = startX;
        longPressTimer = setTimeout(() => {
          longPressed = true;
          copySingleEntry(entry.id);
          front.classList.add("entry-copied");
          setTimeout(() => front.classList.remove("entry-copied"), 400);
        }, 450);
      }, { passive: true });

      front.addEventListener("touchmove", (e) => {
        currentX = e.touches[0].clientX;
        const dx = currentX - startX;
        if (Math.abs(dx) > 10) {
          clearTimeout(longPressTimer);
          swiping = true;
        }
        if (dx < 0) {
          front.style.transform = "translateX(" + Math.max(dx, -120) + "px)";
        } else if (dx > 0) {
          front.style.transform = "translateX(" + Math.min(dx, 120) + "px)";
        }
      }, { passive: true });

      front.addEventListener("touchend", () => {
        clearTimeout(longPressTimer);
        const dx = currentX - startX;
        if (dx < -80) {
          front.style.transition = "transform 0.2s ease, opacity 0.2s ease";
          front.style.transform = "translateX(-120%)";
          front.style.opacity = "0";
          setTimeout(() => deleteEntry(entry.id), 180);
        } else if (dx > 60) {
          front.style.transition = "transform 0.2s ease";
          front.style.transform = "translateX(120px)";
          revealed = true;
        } else {
          front.style.transition = "transform 0.2s ease";
          front.style.transform = "";
          revealed = false;
        }
        setTimeout(() => { swiping = false; }, 50);
      });

      front.addEventListener("touchcancel", () => {
        clearTimeout(longPressTimer);
        front.style.transform = "";
        revealed = false;
      });

      wrap.querySelectorAll("[data-entry-btn]").forEach((el) => {
        el.addEventListener("click", (e) => {
          e.stopPropagation();
          const entryId = el.getAttribute("data-entry-btn");
          const btnIdx = parseInt(el.getAttribute("data-btn-idx"), 10);
          registerEntryButtonClick(entryId, btnIdx);
        });
      });

      entryList.appendChild(wrap);
    });
  }
  async function deleteEntry(entryId) { if (!activeCardIdForEntries) return; const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return; card.entries = card.entries.filter((e) => e.id !== entryId); await saveStateToFirestore(); renderEntryList(); renderCurrentView(); }
  async function copySingleEntry(entryId) { const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return; const entry = card.entries.find((e) => e.id === entryId); if (!entry) return; const displayNum = buildEntryNumberMap(card).get(entry.id); await navigator.clipboard.writeText(`${displayNum}. ${entry.label} - ${new Date(entry.createdAt).toLocaleString()}`); }
  async function copyAllEntries() { const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return; const numberMap = buildEntryNumberMap(card); const sorted = [...card.entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); const text = sorted.map((e) => `${numberMap.get(e.id)}. ${e.label} - ${new Date(e.createdAt).toLocaleString()}`).join("\n"); await navigator.clipboard.writeText(text || ""); }

  // ── Description Modal Logic ──────────────────────────────────────────────
  function openDescriptionModal(entryId) {
    const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return;
    const entry = card.entries.find((e) => e.id === entryId); if (!entry) return;
    activeEntryIdForDescription = entry.id;
    const displayNum = buildEntryNumberMap(card).get(entry.id);
    descriptionModalTitle.textContent = `Edit Entry #${displayNum}`;
    entryNameInput.value = entry.label; entryNumberInput.value = displayNum; entryNumberInput.max = card.entries.length; entryDescriptionInput.value = entry.description || "";
    const buttonsHtml = (entry.buttons || []).map((b, idx) => `<span class="chip">${escapeHtml(b.name)}: ${b.clickCount || 0}</span>`).join("");
    entryButtonStats.innerHTML = `<div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;"><strong>Buttons:</strong>${buttonsHtml || '<span class="muted">No buttons yet</span>'}</div><div style="margin-top:8px; display:flex; gap:8px;"><input type="text" id="new-entry-btn-name" placeholder="Button name..." style="flex:1; padding:4px 8px;"><button id="add-entry-btn" class="inline-btn" type="button">Add Button</button></div>`;
    descriptionModal.classList.remove("hidden");
    setTimeout(() => {
      const addBtn = document.getElementById("add-entry-btn");
      if (addBtn) addBtn.addEventListener("click", () => { const input = document.getElementById("new-entry-btn-name"); const name = input?.value?.trim(); if (name) { addEntryButton(entryId, name); input.value = ""; openDescriptionModal(entryId); } });
    }, 0);
  }
  async function saveEntryDescription() {
    const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return;
    const entry = card.entries.find((e) => e.id === activeEntryIdForDescription); if (!entry) return;
    const newLabel = entryNameInput.value.trim(); if (newLabel) entry.label = newLabel;
    entry.description = entryDescriptionInput.value;
    const total = card.entries.length; const newPos = parseInt(entryNumberInput.value, 10);
    if (!isNaN(newPos) && newPos >= 1 && newPos <= total) { const sorted = getSortedEntries(card); const withoutThis = sorted.filter(e => e.id !== entry.id); withoutThis.splice(newPos - 1, 0, entry); withoutThis.forEach((e, idx) => { e.sortOrder = idx + 1; }); }
    await saveStateToFirestore(); descriptionModal.classList.add("hidden"); renderEntryList(); renderCurrentView();
  }
  async function registerEntryButtonClick(entryId, buttonIndex) { const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return; const entry = card.entries.find((e) => e.id === entryId); if (!entry || !entry.buttons || !entry.buttons[buttonIndex]) return; entry.buttons[buttonIndex].clickCount = (entry.buttons[buttonIndex].clickCount || 0) + 1; await saveStateToFirestore(); renderEntryList(); }
  async function addEntryButton(entryId, buttonName) { const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return; const entry = card.entries.find((e) => e.id === entryId); if (!entry) return; if (!entry.buttons) entry.buttons = []; entry.buttons.push({ id: uid("entry-btn"), name: buttonName, clickCount: 0 }); await saveStateToFirestore(); renderEntryList(); }
  async function removeEntryButton(entryId, buttonIndex) { const card = state.cards.find((c) => c.id === activeCardIdForEntries); if (!card) return; const entry = card.entries.find((e) => e.id === entryId); if (!entry || !entry.buttons) return; entry.buttons.splice(buttonIndex, 1); await saveStateToFirestore(); renderEntryList(); }

  // ── Escape Helpers ───────────────────────────────────────────────────────
  function escapeHtml(text) { return String(text).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
  function escapeAttribute(text) { return escapeHtml(text).replaceAll("`", ""); }

  // ── Auth Logic ───────────────────────────────────────────────────────────
  if (auth) {
    const provider = new GoogleAuthProvider();
    let authStateResolved = false; let isSigningIn = false;

    function setSignInButtonsDisabled(disabled) { if (signInBtn) signInBtn.disabled = disabled; if (welcomeSignInBtn) welcomeSignInBtn.disabled = disabled; }
    function showAuthError(err) {
      let errorMessage = "Sign-in failed. Please try again."; const errorCode = err?.code || "";
      if (errorCode === "auth/unauthorized-domain") errorMessage = "This domain is not authorized. Add it in Firebase Console.";
      else if (errorCode === "auth/popup-blocked") errorMessage = "Popup was blocked. Allow popups for this site.";
      else if (errorCode === "auth/popup-closed-by-user") errorMessage = "Sign-in was cancelled.";
      else if (errorCode === "auth/network-request-failed") errorMessage = "Network error. Check your internet connection.";
      else if (errorCode === "auth/cancelled-popup-request") errorMessage = "";
      else if (err?.message) errorMessage = err.message;
      if (errorMessage) { authHint.textContent = errorMessage; authHint.style.color = "#b91c1c"; }
    }

    setLoadingUI();
    const authTimeout = setTimeout(() => { if (!authStateResolved) { authStateResolved = true; setSignedOutUI(); authHint.textContent = "Taking too long? Check your internet connection or try refreshing."; authHint.style.color = "#b45309"; } }, 8000);

    const handleSignIn = async () => {
      if (isSigningIn) return; isSigningIn = true; setSignInButtonsDisabled(true);
      authHint.textContent = "Opening Google sign-in…"; authHint.style.color = "";
      try { await signInWithPopup(auth, provider); } 
      catch (err) {
        const errorCode = err?.code || "";
        if (errorCode === "auth/popup-blocked" || errorCode === "auth/operation-not-supported-in-this-environment") { authHint.textContent = "Redirecting to Google…"; await signInWithRedirect(auth, provider); return; }
        showAuthError(err); setSignedOutUI();
      } finally { isSigningIn = false; setSignInButtonsDisabled(false); }
    };

    if (signInBtn) signInBtn.addEventListener("click", handleSignIn);
    if (welcomeSignInBtn) welcomeSignInBtn.addEventListener("click", handleSignIn);
    signOutBtn.addEventListener("click", async () => { authHint.textContent = ""; setLoadingUI(); try { await signOut(auth); } catch (err) { authHint.textContent = err?.message || "Sign-out failed."; authHint.style.color = "#b91c1c"; setSignedOutUI(); } });

    async function applyAuthUser(user) {
      clearTimeout(authTimeout); authStateResolved = true;
      if (user) {
        const alreadySignedIn = user.uid === currentUserId && appEl && !appEl.classList.contains("hidden");
        if (alreadySignedIn) return;
        setLoadingUI(); currentUserId = user.uid;
        try { await loadStateFromFirestore(); setSignedInUI(user); initAppOnce(); } 
        catch (err) { console.error("Error loading user data:", err); showSyncWarning("Signed in, but could not load your data."); setSignedInUI(user); initAppOnce(); }
        return;
      }
      if (!currentUserId) { setSignedOutUI(); return; }
      currentUserId = null; state = defaultState(); setSignedOutUI();
    }

    onAuthStateChanged(auth, (user) => { applyAuthUser(user).catch((err) => console.error("Auth state handler failed:", err)); });
    getRedirectResult(auth).catch((err) => { if (err?.code && err.code !== "auth/cancelled-popup-request") showAuthError(err); });
  } else {
    setSignedOutUI();
    if (signInBtn) signInBtn.addEventListener("click", () => { authHint.textContent = "Firebase isn't configured yet. Add your Firebase config first, then reload."; authHint.style.color = "#b45309"; });
  }

  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && currentUserId) { renderCurrentView(); } });
});
