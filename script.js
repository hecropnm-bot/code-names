const socket = io();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let room = null;
let showSpyMap = false;
let audioContext = null;
let lastGameStatus = "lobby";
let lastRoomState = null;

const savedName = localStorage.getItem("codename-player") || "";
$("#createName").value = savedName;
$("#joinName").value = savedName;
$("#quickLammaName").value = savedName;

function go(page, push = true) {
  $$(".page").forEach((section) => section.classList.toggle("active", section.dataset.page === page));
  document.body.dataset.page = page;
  if (push) history.pushState({ page }, "", page === "home" ? "/" : `/${page}`);
  requestAnimationFrame(revealVisible);
}

function pageFromPath() {
  const name = location.pathname.replace("/", "") || "home";
  return ["home", "rooms", "game", "rules", "teams", "lamma"].includes(name) ? name : "home";
}

function tone(frequency, duration = 0.08, type = "sine", gain = 0.045) {
  try {
    audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const volume = audioContext.createGain();
    oscillator.type = type;
    oscillator.frequency.value = frequency;
    volume.gain.value = gain;
    oscillator.connect(volume);
    volume.connect(audioContext.destination);
    oscillator.start();
    volume.gain.exponentialRampToValueAtTime(0.0001, audioContext.currentTime + duration);
    oscillator.stop(audioContext.currentTime + duration);
  } catch {}
}

function sound(name) {
  if (name === "start") {
    tone(392, 0.08, "triangle", 0.045);
    setTimeout(() => tone(523, 0.1, "triangle", 0.05), 85);
    return;
  }
  if (name === "turn") {
    tone(330, 0.06, "square", 0.03);
    setTimeout(() => tone(494, 0.08, "square", 0.035), 70);
    return;
  }
  if (name === "success") return tone(740, 0.11, "triangle", 0.055);
  if (name === "error") return tone(180, 0.15, "sawtooth", 0.035);
  if (name === "reveal") {
    tone(440, 0.06, "triangle", 0.045);
    setTimeout(() => tone(660, 0.08, "triangle", 0.04), 70);
    return;
  }
  if (name === "win") {
    tone(523, 0.09, "triangle", 0.05);
    setTimeout(() => tone(659, 0.09, "triangle", 0.05), 90);
    setTimeout(() => tone(784, 0.16, "triangle", 0.055), 180);
    return;
  }
  tone(320, 0.045, "square", 0.025);
}

function message(text, isError = true) {
  $("#roomMessage").textContent = text || "";
  $("#actionMessage").textContent = text || "";
  $("#roomMessage").style.color = isError ? "var(--red)" : "var(--green-shadow)";
  $("#actionMessage").style.color = isError ? "var(--red)" : "var(--green-shadow)";
  if (text) sound(isError ? "error" : "success");
}

function openHintSheet() {
  $("#hintSheet").classList.add("visible");
  $("#hintSheet").setAttribute("aria-hidden", "false");
  $("#quickHintWord").focus();
}

function closeHintSheet() {
  $("#hintSheet").classList.remove("visible");
  $("#hintSheet").setAttribute("aria-hidden", "true");
}

function submitHint(word, number, afterSuccess = () => {}) {
  if (!room) return message("ادخل غرفة أولاً.");
  socket.emit("game:hint", {
    code: room.code,
    word,
    number
  }, (reply) => {
    if (reply && !reply.ok) return message(reply.message);
    if (room?.settings.mode === "lamma") {
      showSpyMap = false;
      message("تم إرسال التلميح وإخفاء الخريطة. الهاتف جاهز للتخمين.", false);
    }
    afterSuccess();
    renderRoom();
  });
}

function roleLabel(role) {
  return role === "spymaster" ? "قائد" : "لاعب";
}

function teamArabic(team) {
  return team === "red" ? "الأحمر" : team === "blue" ? "الأزرق" : "بدون فريق";
}

function playerLine(player) {
  const ready = player.ready ? "جاهز" : "ينتظر";
  const readyClass = player.ready ? "ready" : "waiting";
  return `<li><span>${player.name} - ${roleLabel(player.role)}</span><em class="${readyClass}">${ready}</em></li>`;
}

function remaining(team) {
  return room?.game.board.filter((card) => card.role === team && !card.revealed).length ?? 0;
}

function myPlayer() {
  return room?.players.find((player) => player.id === room.me);
}

function canReveal() {
  const me = myPlayer();
  if (!room || room.game.status !== "playing") return false;
  if (!room.game.hint) return false;
  if (room.game.guessesMade >= room.game.guessLimit) return false;
  if (room.settings.mode === "lamma") return room.hostId === room.me;
  return me?.team === room.game.currentTeam && me?.role !== "spymaster";
}

function renderBoard() {
  const board = $("#board");
  board.innerHTML = "";
  if (!room) {
    board.innerHTML = `<div class="empty-state">ادخل غرفة حتى تظهر لوحة اللعب.</div>`;
    return;
  }

  room.game.board.forEach((card) => {
    const button = document.createElement("button");
    const knownRole = card.role;
    const classRole = card.revealed ? knownRole : showSpyMap && knownRole ? `spy-${knownRole}` : "";
    button.className = ["word-card", classRole, card.revealed ? "revealed" : ""].filter(Boolean).join(" ");
    button.type = "button";
    button.disabled = !canReveal() || card.revealed || room.game.status !== "playing";
    button.textContent = knownRole === "assassin" && card.revealed ? `${card.word} ×` : card.word;
    if ((showSpyMap && knownRole) || card.revealed) {
      const identity = document.createElement("span");
      identity.className = "identity";
      identity.textContent = knownRole === "red" ? "أحمر" : knownRole === "blue" ? "أزرق" : knownRole === "neutral" ? "محايد" : "قاتل";
      button.appendChild(identity);
    }
    button.addEventListener("click", () => {
      sound("reveal");
      socket.emit("game:reveal", { code: room.code, cardId: card.id }, (reply) => {
        if (reply && !reply.ok) message(reply.message);
      });
    });
    board.appendChild(button);
  });
}

function renderPlayers() {
  if (room?.settings.mode === "lamma") {
    const lamma = room.settings.lamma;
    $("#redTeamTitle").textContent = lamma.redName;
    $("#blueTeamTitle").textContent = lamma.blueName;
    $("#redPlayers").innerHTML = [`قائد: ${lamma.redCaptain}`, ...lamma.redPlayers].map((name) => `<li>${name}</li>`).join("");
    $("#bluePlayers").innerHTML = [`قائد: ${lamma.blueCaptain}`, ...lamma.bluePlayers].map((name) => `<li>${name}</li>`).join("");
    $("#redRemaining").textContent = `${remaining("red")} بطاقات`;
    $("#blueRemaining").textContent = `${remaining("blue")} بطاقات`;
    return;
  }
  const red = room?.players.filter((p) => p.team === "red") || [];
  const blue = room?.players.filter((p) => p.team === "blue") || [];
  $("#redTeamTitle").textContent = "الفريق الأحمر";
  $("#blueTeamTitle").textContent = "الفريق الأزرق";
  $("#redPlayers").innerHTML = red.map(playerLine).join("") || "<li>لا يوجد</li>";
  $("#bluePlayers").innerHTML = blue.map(playerLine).join("") || "<li>لا يوجد</li>";
  $("#redRemaining").textContent = `${remaining("red")} بطاقات`;
  $("#blueRemaining").textContent = `${remaining("blue")} بطاقات`;
}

function renderRoom() {
  if (!room) {
    document.body.dataset.gameStatus = "empty";
    $("#roomEyebrow").textContent = "لم تدخل غرفة بعد";
    $("#roomTitle").textContent = "اللعبة";
    $("#modeBadge").textContent = "لا توجد غرفة";
    $("#turnPill").textContent = "انتظار";
    $("#activeHint").textContent = "التلميح: لا يوجد";
    $("#strictStatus").textContent = "القوانين الصارمة: ادخل غرفة حتى تبدأ.";
    $("#mobileTurnText").textContent = "انتظار";
    $("#mobileHintText").textContent = "ادخل غرفة للبدء";
    $("#gameLog").innerHTML = "<li>أنشئ غرفة أو ادخل برمز للبدء.</li>";
    $("#lammaPanel").style.display = "none";
    renderBoard();
    return;
  }

  const me = myPlayer();
  document.body.dataset.gameStatus = room.game.status;
  $("#roomEyebrow").textContent = `رمز الغرفة: ${room.code}`;
  $("#roomTitle").textContent = room.name;
  $("#modeBadge").textContent = room.settings.mode === "lamma" ? "طور لمة" : "طور أونلاين";
  $("#playerName").value = me?.name || "";
  $("#playerRole").value = me?.role || "guesser";
  $("#readyButton").textContent = me?.ready ? "إلغاء الجاهزية" : "جاهز للأونلاين";
  $("#readyButton").classList.toggle("is-ready", Boolean(me?.ready));
  $("#turnPill").textContent = room.game.status === "playing" ? `دور الفريق ${teamArabic(room.game.currentTeam)}` : "انتظار البداية";
  $("#turnPill").classList.toggle("blue", room.game.currentTeam === "blue");
  $("#activeHint").textContent = room.game.hint ? `التلميح: ${room.game.hint.word} - ${room.game.hint.number}` : "التلميح: لا يوجد";
  $("#mobileTurnText").textContent = room.game.status === "playing" ? `دور ${teamArabic(room.game.currentTeam)}` : "انتظار البداية";
  $("#mobileHintText").textContent = room.game.hint ? `${room.game.hint.word} - ${room.game.hint.number}` : "لا يوجد تلميح";
  $("#strictStatus").textContent = room.game.hint
    ? `القوانين الصارمة: ${room.game.guessesMade} من ${room.game.guessLimit} تخمينات مستخدمة.`
    : "القوانين الصارمة: لا يمكن كشف بطاقة قبل إدخال تلميح.";
  $("#viewDescription").textContent = showSpyMap ? "خريطة القائد ظاهرة لهذا الجهاز فقط." : "وضع اللاعبين يخفي الخريطة السرية.";
  $("#toggleMapButton").textContent = showSpyMap ? "إخفاء خريطة القائد" : "عرض خريطة القائد";
  $("#quickSpyButton").textContent = room.settings.mode === "lamma"
    ? (showSpyMap ? "تخمين" : "قائد")
    : (showSpyMap ? "إخفاء" : "قائد");
  $("#lammaPanel").style.display = room.settings.mode === "lamma" ? "block" : "none";
  if (room.settings.mode === "lamma") {
    const lamma = room.settings.lamma;
    $("#lammaRedName").value = lamma.redName;
    $("#lammaBlueName").value = lamma.blueName;
    $("#lammaRedCaptain").value = lamma.redCaptain;
    $("#lammaBlueCaptain").value = lamma.blueCaptain;
    $("#lammaRedPlayers").value = lamma.redPlayers.join("\n");
    $("#lammaBluePlayers").value = lamma.bluePlayers.join("\n");
  }
  $("#gameLog").innerHTML = room.game.log.map((item) => `<li>${item}</li>`).join("");
  renderPlayers();
  renderBoard();

  if (room.game.status === "ended") {
    if (lastGameStatus !== "ended") sound("win");
    $("#resultTitle").textContent = room.game.winner === "red" ? "فاز الفريق الأحمر!" : "فاز الفريق الأزرق!";
    $("#resultText").textContent = room.game.message;
    $("#resultOverlay").classList.add("visible");
    $("#resultOverlay").setAttribute("aria-hidden", "false");
  } else {
    $("#resultOverlay").classList.remove("visible");
    $("#resultOverlay").setAttribute("aria-hidden", "true");
  }
  lastGameStatus = room.game.status;
}

function updateMe(patch) {
  if (!room) return message("ادخل غرفة أولاً.");
  socket.emit("player:update", { code: room.code, ...patch });
}

function revealVisible() {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) entry.target.classList.add("visible");
    });
  }, { threshold: 0.12 });
  $$(".reveal").forEach((item) => observer.observe(item));
}

$$("[data-route]").forEach((item) => {
  item.addEventListener("click", (event) => {
    event.preventDefault();
    go(item.dataset.route);
  });
});

document.addEventListener("click", (event) => {
  if (event.target.closest("button, a, select, input")) sound("click");
});

window.addEventListener("popstate", () => go(pageFromPath(), false));

const roomFromLink = new URLSearchParams(location.search).get("room");
if (roomFromLink) {
  $("#joinCode").value = roomFromLink.toUpperCase();
  go("rooms", false);
}

$("#createRoomForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const playerName = $("#createName").value.trim();
  localStorage.setItem("codename-player", playerName);
  socket.emit("room:create", { playerName, name: $("#roomName").value.trim(), mode: $("#roomMode").value }, (reply) => {
    if (!reply.ok) return message(reply.message);
    message(`تم إنشاء الغرفة: ${reply.code}`, false);
    go("game");
  });
});

$("#joinRoomForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const playerName = $("#joinName").value.trim();
  localStorage.setItem("codename-player", playerName);
  socket.emit("room:join", { playerName, code: $("#joinCode").value }, (reply) => {
    if (!reply.ok) return message(reply.message);
    message("تم الدخول إلى الغرفة.", false);
    go("game");
  });
});

$("#quickLammaForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const playerName = $("#quickLammaName").value.trim();
  localStorage.setItem("codename-player", playerName);
  socket.emit("room:create", {
    playerName,
    name: $("#quickLammaRoom").value.trim() || "لمة كود نيمز",
    mode: "lamma"
  }, (reply) => {
    if (!reply.ok) return message(reply.message);
    message("تم إنشاء لمة على هذا الهاتف.", false);
    go("game");
  });
});

$("#playerName").addEventListener("change", () => updateMe({ name: $("#playerName").value }));
$("#playerRole").addEventListener("change", () => updateMe({ role: $("#playerRole").value }));
$("#joinRedButton").addEventListener("click", () => updateMe({ team: "red" }));
$("#joinBlueButton").addEventListener("click", () => updateMe({ team: "blue" }));
$("#readyButton").addEventListener("click", () => {
  const me = myPlayer();
  if (!room) return message("ادخل غرفة أولاً.");
  if (room.settings.mode !== "online") return message("الجاهزية مخصصة للأونلاين.");
  if (!me?.team) return message("اختر فريقك قبل الجاهزية.");
  updateMe({ ready: !me.ready });
});

$("#toggleMapButton").addEventListener("click", () => {
  const me = myPlayer();
  if (!room) return message("ادخل غرفة أولاً.");
  if (room.settings.mode !== "lamma" && me?.role !== "spymaster") return message("خريطة القائد تظهر لمن اختار دور قائد الفريق فقط.");
  if (room.settings.mode === "lamma" && room.hostId !== room.me) return message("في طور لمة صاحب الغرفة فقط يفتح خريطة القائد.");
  if (!showSpyMap && !confirm("هذا الوضع مخصص للقادة فقط. لا تدع اللاعبين يرونه.")) return;
  showSpyMap = !showSpyMap;
  renderRoom();
});

$("#captainModeButton").addEventListener("click", () => {
  if (!room) return message("ادخل غرفة أولاً.");
  if (room.settings.mode !== "lamma") return message("وضع القائد السريع خاص بطور لمة.");
  if (room.hostId !== room.me) return message("صاحب الغرفة فقط يتحكم بطور لمة.");
  if (!showSpyMap && !confirm("اعرض الخريطة للقائد فقط. أبعد الهاتف عن اللاعبين قبل الموافقة.")) return;
  showSpyMap = true;
  sound("success");
  renderRoom();
});

$("#guessModeButton").addEventListener("click", () => {
  if (!room) return message("ادخل غرفة أولاً.");
  if (room.settings.mode !== "lamma") return message("وضع التخمين خاص بطور لمة.");
  showSpyMap = false;
  message("الهاتف الآن في وضع التخمين. يمكن تسليمه للاعبين.", false);
  renderRoom();
});

$("#startGameButton").addEventListener("click", () => {
  if (!room) return message("ادخل غرفة أولاً.");
  socket.emit("game:start", { code: room.code, starter: "random" }, (reply) => {
    if (reply && !reply.ok) message(reply.message);
  });
});

$("#saveLammaButton").addEventListener("click", () => {
  if (!room) return message("ادخل غرفة أولاً.");
  if (room.settings.mode !== "lamma") return message("هذه الإعدادات مخصصة لطور لمة.");
  socket.emit("lamma:setup", {
    code: room.code,
    setup: {
      redName: $("#lammaRedName").value,
      blueName: $("#lammaBlueName").value,
      redCaptain: $("#lammaRedCaptain").value,
      blueCaptain: $("#lammaBlueCaptain").value,
      redPlayers: $("#lammaRedPlayers").value.split("\n"),
      bluePlayers: $("#lammaBluePlayers").value.split("\n")
    }
  });
  message("تم حفظ إعدادات لمة.", false);
});

$("#playAgainButton").addEventListener("click", () => {
  if (room) socket.emit("game:new", { code: room.code });
});

$("#hintForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitHint($("#hintWord").value, $("#hintNumber").value, () => {
    $("#hintWord").value = "";
    $("#hintNumber").value = "";
  });
});

$("#clearHintButton").addEventListener("click", () => {
  if (room) socket.emit("game:clearHint", { code: room.code });
});

$("#endTurnButton").addEventListener("click", () => {
  if (room) socket.emit("game:endTurn", { code: room.code });
});

$("#quickHintButton").addEventListener("click", openHintSheet);
$("#closeHintSheetButton").addEventListener("click", closeHintSheet);
$("#hintSheet").addEventListener("click", (event) => {
  if (event.target.id === "hintSheet") closeHintSheet();
});
$("#quickHintForm").addEventListener("submit", (event) => {
  event.preventDefault();
  submitHint($("#quickHintWord").value, $("#quickHintNumber").value, () => {
    $("#quickHintWord").value = "";
    $("#quickHintNumber").value = "";
    closeHintSheet();
  });
});
$("#quickEndTurnButton").addEventListener("click", () => {
  if (room) socket.emit("game:endTurn", { code: room.code });
});
$("#quickSpyButton").addEventListener("click", () => {
  if (!room) return message("ادخل غرفة أولاً.");
  if (room.settings.mode === "lamma") {
    if (showSpyMap) {
      showSpyMap = false;
      message("وضع التخمين مفعل. الهاتف جاهز للاعبين.", false);
    } else {
      if (!confirm("اعرض الخريطة للقائد فقط. أبعد الهاتف عن اللاعبين قبل الموافقة.")) return;
      showSpyMap = true;
      sound("success");
    }
    renderRoom();
    return;
  }
  $("#toggleMapButton").click();
});

$("#copyLinkButton").addEventListener("click", async () => {
  if (!room) return message("ادخل غرفة أولاً.");
  const link = `${location.origin}/rooms?room=${room.code}`;
  try {
    await navigator.clipboard.writeText(link);
    message("تم نسخ رابط الدعوة.", false);
  } catch {
    message(`رابط الدعوة: ${link}`, false);
  }
});

function playOnlineStateSounds(previous, next) {
  if (!previous || !next) return;
  if (previous.game.status !== "playing" && next.game.status === "playing") sound("start");
  if (previous.game.status === "playing" && next.game.status === "playing" && previous.game.currentTeam !== next.game.currentTeam) sound("turn");
  const prevRevealed = previous.game.board.filter((card) => card.revealed).length;
  const nextRevealed = next.game.board.filter((card) => card.revealed).length;
  if (nextRevealed > prevRevealed) sound("reveal");
}

socket.on("room:state", (nextRoom) => {
  playOnlineStateSounds(lastRoomState, nextRoom);
  lastRoomState = nextRoom;
  room = nextRoom;
  renderRoom();
});

socket.on("connect", () => renderRoom());

go(pageFromPath(), false);
revealVisible();
