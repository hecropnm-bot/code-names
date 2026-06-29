const realtimeAvailable = typeof window.io === "function";
const offlineSocketMessage = "الأونلاين يحتاج خادم Node يدعم Socket.IO. طور لمة يعمل على هذا الجهاز، ولتشغيل الغرف الحقيقية استخدم Render أو Railway.";
const socket = realtimeAvailable ? window.io() : createLocalSocket();

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

let room = null;
let showSpyMap = false;
let audioContext = null;
let lastGameStatus = "lobby";
let lastRoomState = null;
let localRoom = null;

const LOCAL_PLAYER_ID = "local-host";
const LOCAL_SAVE_KEY = "codename-local-lamma";
const LOCAL_WORD_POOL = `
قمر شمس نجم سماء غيمة مطر بحر نهر جزيرة صحراء غابة جبل وادي مدينة قرية شارع جسر باب نافذة
بيت مدرسة جامعة مكتبة متحف ملعب سوق حديقة مطار محطة قطار سيارة سفينة طائرة دراجة حصان مفتاح خريطة رسالة سر
كلمة رقم لون صوت ضوء ظل نار ثلج ذهب فضة ساعة هاتف حاسوب كاميرا كتاب قلم ورقة صندوق كرسي طاولة مصباح
مرآة سيف درع تاج قناع لعبة لغز ذاكرة حلم فرح خطر طريق رحلة كنز وكيل رمز شبكة قلعة برج كهف بوابة مختبر
روبوت كوكب مجرة فضاء كابتن فريق بطاقة دليل إشارة علامة ملف صورة نظارة قبعة حقيبة دواء مطبخ فرن ملعقة سلم
حبل جرس موجة لؤلؤ مرجان نافورة تمثال مسرح سينما أغنية إيقاع عود لوحة حبر صحيفة خبر رئيس وزير محامي قاضي
شرطي إسعاف مستشفى صيدلية بنك عملة محفظة هدية عيد ضيف مقهى مطعم فندق شاطئ ميناء مرسى بطولة كأس هدف كرة
تنس سباق مغامرة خطة نقطة دور تلميح قاتل محايد عميل أزرق أحمر بغداد بصرة موصل أربيل نجف كربلاء سامراء
رمادي كركوك دهوك واسط ديالى ميسان ناصرة حلة كوت عمارة فلوجة تكريت حديثة زاخو دجلة فرات خبز رز لحم دجاج
سمك بيض جبن لبن حليب عسل شاي قهوة عصير ماء ملح سكر فلفل زيت تمر كعك حلوى فطور غداء عشاء مطعم وصفة
مذاق رائحة مسرح موسيقى بيانو كمان كاميرا مشهد بطل قصة نهاية بداية فصل صفحة عنوان إعلان بنك مال دينار دولار
مصنع آلة زر محرك عجلة مسمار مطرقة منشار خوذة عامل مهندس بناء حجر طين زجاج معدن خشب ورشة تجربة خطأ نجاح
طاقة قوة سرعة زمن مسافة وزن كتلة ذرة خلية نواة جاسوس مهمة سرية قاعدة شيفرة مخبأ بصمة دليل أثر ليل صامت
مزرعة بستان حقل قمح شعير نخيل بئر دلو فلاح حصاد زقاق قصر ديوان مجلس ضيف دلة فنجان بساط خيمة نار
`.trim().split(/\s+/);

const savedName = localStorage.getItem("codename-player") || "";
$("#createName").value = savedName;
$("#joinName").value = savedName;
$("#quickLammaName").value = savedName;

if (!realtimeAvailable) {
  $("#roomMessage").textContent = offlineSocketMessage;
  $("#actionMessage").textContent = offlineSocketMessage;
}

function createLocalSocket() {
  const listeners = {};
  const notify = (event, payload) => (listeners[event] || []).forEach((handler) => handler(payload));
  return {
    emit(event, payload = {}, reply) {
      handleLocalEmit(event, payload, reply, notify);
    },
    on(event, handler) {
      listeners[event] ||= [];
      listeners[event].push(handler);
    }
  };
}

function localClone(value) {
  return JSON.parse(JSON.stringify(value));
}

function localShuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function localCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function localStarter(value = "random") {
  if (value === "red" || value === "blue") return value;
  return Math.random() > 0.5 ? "red" : "blue";
}

function localTeamName(team) {
  return team === "red" ? "الأحمر" : "الأزرق";
}

function localNewGame(settings = {}) {
  const starter = localStarter(settings.starter);
  const second = starter === "red" ? "blue" : "red";
  const roles = localShuffle([
    ...Array(9).fill(starter),
    ...Array(8).fill(second),
    ...Array(7).fill("neutral"),
    "assassin"
  ]);

  return {
    status: "lobby",
    board: localShuffle(LOCAL_WORD_POOL).slice(0, 25).map((word, index) => ({
      id: `local-${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
      word,
      role: roles[index],
      revealed: false
    })),
    currentTeam: starter,
    starter,
    hint: null,
    guessesMade: 0,
    guessLimit: 0,
    winner: null,
    message: "",
    log: [`الفريق ${localTeamName(starter)} يبدأ الجولة.`]
  };
}

function localMakeRoom(name, playerName) {
  const settings = {
    starter: "random",
    mode: "lamma",
    lamma: {
      redName: "الفريق الأحمر",
      blueName: "الفريق الأزرق",
      redCaptain: "قائد الأحمر",
      blueCaptain: "قائد الأزرق",
      redPlayers: ["لاعب 1", "لاعب 2"],
      bluePlayers: ["لاعب 1", "لاعب 2"]
    }
  };
  return {
    code: localCode(),
    name: name || "لمة كود نيمز",
    hostId: LOCAL_PLAYER_ID,
    me: LOCAL_PLAYER_ID,
    local: true,
    settings,
    players: [{
      id: LOCAL_PLAYER_ID,
      name: playerName || "صاحب الهاتف",
      team: "red",
      role: "spymaster",
      ready: true
    }],
    game: localNewGame(settings)
  };
}

function localSave(notify) {
  try {
    localStorage.setItem(LOCAL_SAVE_KEY, JSON.stringify(localRoom));
  } catch {}
  notify("room:state", localClone(localRoom));
}

function localRemaining(team) {
  return localRoom.game.board.filter((card) => card.role === team && !card.revealed).length;
}

function localFinish(winner, text) {
  localRoom.game.status = "ended";
  localRoom.game.winner = winner;
  localRoom.game.message = text;
  localRoom.game.log.unshift(text);
}

function localSwitchTurn(reason) {
  localRoom.game.currentTeam = localRoom.game.currentTeam === "red" ? "blue" : "red";
  localRoom.game.hint = null;
  localRoom.game.guessesMade = 0;
  localRoom.game.guessLimit = 0;
  localRoom.game.log.unshift(`${reason} الدور الآن للفريق ${localTeamName(localRoom.game.currentTeam)}.`);
}

function localCleanList(items, fallback) {
  const list = Array.isArray(items)
    ? items.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 10)
    : [];
  return list.length ? list : fallback;
}

function handleLocalEmit(event, payload, reply, notify) {
  if (event === "room:create") {
    if (payload.mode !== "lamma") {
      return reply?.({ ok: false, message: "نسخة Vercel تشغل طور لمة على نفس الجهاز. للأونلاين الحقيقي انشر نسخة Node على Render أو Railway." });
    }
    localRoom = localMakeRoom(String(payload.name || "").trim(), String(payload.playerName || "").trim());
    reply?.({ ok: true, code: localRoom.code });
    return localSave(notify);
  }

  if (event === "room:join") {
    return reply?.({ ok: false, message: "الدخول برمز يحتاج خادم أونلاين. طور لمة يعمل مباشرة من زر لمة." });
  }

  if (!localRoom) {
    return reply?.({ ok: false, message: "ابدأ طور لمة أولاً." });
  }

  if (event === "player:update") {
    const player = localRoom.players[0];
    if (typeof payload.name === "string" && payload.name.trim()) player.name = payload.name.trim().slice(0, 18);
    if (payload.team === "red" || payload.team === "blue") player.team = payload.team;
    if (payload.role === "guesser" || payload.role === "spymaster") player.role = payload.role;
    return localSave(notify);
  }

  if (event === "lamma:setup") {
    const setup = payload.setup || {};
    const lamma = localRoom.settings.lamma;
    if (typeof setup.redName === "string" && setup.redName.trim()) lamma.redName = setup.redName.trim().slice(0, 22);
    if (typeof setup.blueName === "string" && setup.blueName.trim()) lamma.blueName = setup.blueName.trim().slice(0, 22);
    if (typeof setup.redCaptain === "string" && setup.redCaptain.trim()) lamma.redCaptain = setup.redCaptain.trim().slice(0, 22);
    if (typeof setup.blueCaptain === "string" && setup.blueCaptain.trim()) lamma.blueCaptain = setup.blueCaptain.trim().slice(0, 22);
    lamma.redPlayers = localCleanList(setup.redPlayers, lamma.redPlayers);
    lamma.bluePlayers = localCleanList(setup.bluePlayers, lamma.bluePlayers);
    localRoom.game.log.unshift("تم تحديث إعدادات طور لمة.");
    return localSave(notify);
  }

  if (event === "game:start" || event === "game:new") {
    localRoom.settings.starter = payload.starter || localRoom.settings.starter || "random";
    localRoom.game = localNewGame(localRoom.settings);
    localRoom.game.status = "playing";
    localRoom.game.log.unshift(event === "game:start"
      ? "بدأ طور لمة المحلي. افتح وضع القائد للتلميح ثم أخف الخريطة قبل التخمين."
      : "جولة محلية جديدة بدأت.");
    reply?.({ ok: true });
    return localSave(notify);
  }

  if (event === "game:hint") {
    if (localRoom.game.status !== "playing") return reply?.({ ok: false, message: "ابدأ الجولة أولاً." });
    const cleanWord = String(payload.word || "").trim();
    const cleanNumber = Number(payload.number);
    if (!cleanWord || !Number.isInteger(cleanNumber) || cleanNumber < 1 || cleanNumber > 9) {
      return reply?.({ ok: false, message: "اكتب كلمة ورقم من 1 إلى 9." });
    }
    localRoom.game.hint = { word: cleanWord.slice(0, 20), number: cleanNumber };
    localRoom.game.guessesMade = 0;
    localRoom.game.guessLimit = cleanNumber + 1;
    localRoom.game.log.unshift(`تلميح الفريق ${localTeamName(localRoom.game.currentTeam)}: ${cleanWord} - ${cleanNumber}.`);
    reply?.({ ok: true });
    return localSave(notify);
  }

  if (event === "game:clearHint") {
    localRoom.game.hint = null;
    localRoom.game.log.unshift("تم مسح التلميح.");
    return localSave(notify);
  }

  if (event === "game:endTurn") {
    if (localRoom.game.status === "playing") localSwitchTurn("تم إنهاء الدور.");
    return localSave(notify);
  }

  if (event === "game:reveal") {
    if (localRoom.game.status !== "playing") return;
    if (!localRoom.game.hint) return reply?.({ ok: false, message: "القانون الصارم: لا يمكن كشف بطاقة قبل التلميح." });
    if (localRoom.game.guessesMade >= localRoom.game.guessLimit) {
      return reply?.({ ok: false, message: "انتهى عدد التخمينات المسموح لهذا الدور." });
    }
    const card = localRoom.game.board.find((item) => item.id === payload.cardId);
    if (!card || card.revealed) return;
    card.revealed = true;
    localRoom.game.guessesMade += 1;
    localRoom.game.log.unshift(`تم كشف بطاقة "${card.word}".`);
    const actingTeam = localRoom.game.currentTeam;
    if (card.role === "assassin") {
      localFinish(actingTeam === "red" ? "blue" : "red", `الفريق ${localTeamName(actingTeam)} كشف القاتل وخسر.`);
    } else if (localRemaining("red") === 0) {
      localFinish("red", "الفريق الأحمر فاز!");
    } else if (localRemaining("blue") === 0) {
      localFinish("blue", "الفريق الأزرق فاز!");
    } else if (card.role !== actingTeam) {
      localSwitchTurn(card.role === "neutral" ? "بطاقة محايدة." : "بطاقة للفريق الآخر.");
    } else if (localRoom.game.guessesMade >= localRoom.game.guessLimit) {
      localSwitchTurn("وصل الفريق إلى الحد الأعلى للتخمينات.");
    }
    reply?.({ ok: true });
    return localSave(notify);
  }
}

function restoreLocalRoom() {
  if (realtimeAvailable) return;
  try {
    const saved = JSON.parse(localStorage.getItem(LOCAL_SAVE_KEY) || "null");
    if (!saved?.local) return;
    localRoom = saved;
    room = localClone(localRoom);
    renderRoom();
  } catch {}
}

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
restoreLocalRoom();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
