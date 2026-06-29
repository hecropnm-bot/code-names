const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);
const PORT = process.env.PORT || 3000;

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(__dirname + "/index.html");
});

const WORDS = [
  "قمر", "شمس", "نجم", "سماء", "غيمة", "مطر", "ريح", "بحر", "نهر", "جزيرة",
  "صحراء", "غابة", "جبل", "وادي", "مدينة", "قرية", "شارع", "جسر", "باب", "نافذة",
  "بيت", "مدرسة", "جامعة", "مكتبة", "متحف", "ملعب", "سوق", "حديقة", "مطار", "محطة",
  "قطار", "سيارة", "سفينة", "طائرة", "صاروخ", "دراجة", "حصان", "أسد", "نمر", "فهد",
  "ذئب", "صقر", "حمامة", "سمكة", "حوت", "نحلة", "فراشة", "وردة", "شجرة", "تفاح",
  "برتقال", "موز", "تمر", "قهوة", "شاي", "سكر", "ملح", "خبز", "جبن", "عسل",
  "طبيب", "مهندس", "معلم", "طالب", "قائد", "حارس", "رسام", "كاتب", "مصور", "مغني",
  "لاعب", "حكم", "ملك", "ملكة", "أمير", "جندي", "مفتاح", "خريطة", "رسالة", "سر",
  "كلمة", "رقم", "لون", "صوت", "ضوء", "ظل", "نار", "ثلج", "ذهب", "فضة",
  "ساعة", "هاتف", "حاسوب", "كاميرا", "راديو", "كتاب", "قلم", "ورقة", "صندوق", "كرسي",
  "طاولة", "مصباح", "مرآة", "سيف", "درع", "تاج", "قناع", "لعبة", "لغز", "ذاكرة",
  "حلم", "فرح", "خطر", "طريق", "رحلة", "كنز", "مفتش", "وكيل", "رمز", "شبكة",
  "قلعة", "برج", "كهف", "بوابة", "مختبر", "روبوت", "كوكب", "مجرة", "فضاء", "كابتن",
  "فريق", "بطاقة", "دليل", "إشارة", "علامة", "ملف", "صورة", "نظارة", "قبعة", "حقيبة",
  "دواء", "مطبخ", "فرن", "ملعقة", "سلم", "حبل", "جرس", "موجة", "لؤلؤ", "مرجان",
  "نافورة", "تمثال", "مسرح", "سينما", "أغنية", "إيقاع", "طبلة", "عود", "لوحة", "حبر",
  "صحيفة", "خبر", "رئيس", "وزير", "محامي", "قاضي", "شرطي", "إسعاف", "مستشفى", "صيدلية",
  "بنك", "عملة", "محفظة", "هدية", "عيد", "ضيف", "مقهى", "مطعم", "فندق", "شاطئ",
  "ميناء", "مرسى", "بطولة", "كأس", "هدف", "شبكة", "حارس", "كرة", "تنس", "سباق",
  "مغامرة", "خطة", "نقطة", "دور", "تلميح", "قاتل", "محايد", "عميل", "أزرق", "أحمر"
];

const EXTRA_WORDS = `
أرض سماء نجوم كوكب مذنب شهاب مدار مجهر تلسكوب قمر شمس خسوف كسوف فجر غروب نهار ليل عاصفة برق رعد ضباب ندى نسيم إعصار ثلج برد حرارة ربيع صيف خريف شتاء
بحر محيط خليج شاطئ موج مد جزيرة ميناء مرسى سفينة قارب شراع غواصة لؤلؤ مرجان سمك حوت قرش دولفين سلحفاة أخطبوط قنديل محارة صخرة رمل كهف نهر بحيرة شلال جدول ينبوع
جبل تل وادي صحراء كثبان غابة شجرة نخلة وردة زهرة عشب ورق غصن جذر بذرة ثمرة تفاح موز عنب تمر رمان تين خوخ مشمش ليمون برتقال فراولة بطيخ شمام خيار طماطم جزر بطاطا بصل ثوم نعناع ريحان
أسد نمر فهد ذئب ثعلب دب فيل زرافة غزال أرنب قرد حصان حمار جمل بقرة خروف ماعز كلب قط فأر سنجاب صقر نسر غراب بومة عصفور بط دجاج ديك حمام نحلة نملة فراشة ذبابة عقرب أفعى تمساح ضفدع
بيت غرفة باب نافذة سقف جدار أرضية سلم مصعد مفتاح قفل كرسي طاولة سرير وسادة بطانية خزانة مرآة مصباح ستارة سجادة مطبخ فرن ثلاجة قدر صحن كوب ملعقة شوكة سكين طبق سلة صندوق حقيبة
شارع طريق جسر نفق إشارة رصيف سيارة حافلة قطار طائرة مطار محطة دراجة دراجةنارية سيارةأجرة شاحنة إسعاف شرطة مطافئ مرور خريطة وجهة رحلة تذكرة جواز حقيبة سفر فندق مطعم مقهى سوق متجر
مدرسة جامعة فصل درس دفتر كتاب قلم ورقة ممحاة حقيبة سبورة طباشير اختبار سؤال جواب درجة معلم طالب مكتبة قصة رواية قصيدة جملة حرف كلمة معنى قاموس ترجمة لغة صوت نطق خط قراءة كتابة
طبيب ممرض مستشفى عيادة دواء حقنة ضماد حرارة نبض علاج ألم صحة عين أذن أنف فم قلب رئة يد قدم رأس شعر جلد دم عظم سن عقل ذاكرة نوم حلم تعب نشاط رياضة سباق كرة هدف ملعب حكم كأس فريق
ملك Queen أمير أميرة وزير رئيس قائد جندي حارس شرطي محقق قاضي محامي شاهد سجن مفتاح سر دليل خريطة مهمة خطة فخ خطر إنقاذ هروب مطاردة كنز ذهب فضة جوهرة تاج سيف درع قناع سهم رمح
حاسوب هاتف شاشة لوحة مفاتيح فأرة كاميرا صورة فيديو صوت ميكروفون سماعة شبكة إنترنت رسالة بريد ملف مجلد زر تطبيق لعبة روبوت ذكاء خوارزمية رمز كلمةسر حساب نافذة رابط موقع خادم غرفة
لون أحمر أزرق أخضر أصفر برتقالي بنفسجي وردي أسود أبيض رمادي ذهبي فضي داكن فاتح طويل قصير واسع ضيق ثقيل خفيف سريع بطيء قريب بعيد قديم جديد حار بارد ناعم خشن قوي ضعيف عالي منخفض
فرح حزن خوف غضب ضحك بكاء حب كره أمل صبر حماس ملل دهشة فخر خجل ثقة شك قرار اختيار وعد سرور صدق كذب شجاعة ذكاء حظ سلام حرب صداقة منافسة تعاون فوز خسارة نقطة دور تلميح تخمين
صباح مساء وقت ساعة دقيقة ثانية يوم أسبوع شهر سنة تاريخ عيد حفلة هدية ضيف دعوة عائلة أب أم أخ أخت ابن بنت جد جدة عم خال صديق جار طفل شاب رجل امرأة إنسان اسم لقب مدينة بلد وطن
بغداد بصرة موصل أربيل نجف كربلاء سامراء رمادي كركوك دهوك واسط ديالى ميسان ناصرة حلة كوت عمارة فلوجة تكريت حديثة زاخو سور قلعة برج بوابة ساحة شارع نهر دجلة فرات
خبز رز لحم دجاج سمك بيض جبن لبن حليب عسل شاي قهوة عصير ماء ملح سكر فلفل زيت تمر كعك حلوى فطور غداء عشاء قدر مطبخ نار فرن طبق مطعم وصفة مذاق رائحة جوع شبع
مسرح سينما أغنية موسيقى إيقاع عود طبلة بيانو كمان لوحة رسام لون فرشاة حبر تمثال متحف معرض كاميرا مشهد بطل قصة نهاية بداية فصل صفحة عنوان خبر صحيفة إذاعة تلفاز برنامج إعلان
بنك مال عملة دينار دولار محفظة بطاقة سعر ربح خسارة بيع شراء فاتورة حساب صندوق متجر بائع زبون هدية طلب شحن بريد طرد وزن ميزان رقم رمز توقيع ختم عقد وعد قرار
مصنع آلة زر محرك عجلة مسمار مطرقة منشار حبل سلم خوذة عامل مهندس بناء جدار حجر طين زجاج معدن خشب ورشة مختبر تجربة عينة نتيجة خطأ نجاح إصلاح عطل كهرباء بطارية
فضاء مركبة رائد محطة مجرة نيزك كويكب ثقب أسود ضوء شعاع ليزر مختبر تجربة عالم نظرية قانون طاقة قوة سرعة زمن بعد مسافة وزن كتلة جاذبية مغناطيس ذرة خلية نواة
وكيل جاسوس عميل مهمة سرية قاعدة شيفرة إشارة رسالة مشفرة ملف ممنوع مراقبة كاميرا حارس باب خلفي مخبأ حقيبة سوداء بطاقة هوية ختم بصمة دليل أثر ظل ليل صامت قناع
مدينة قرية مزرعة بستان حقل قمح شعير تمر نخيل ماء بئر دلو محراث فلاح حصاد سوق شعبي زقاق بيت قديم قصر ديوان مجلس ضيف قهوة عربية دلة فنجان بساط خيمة نار
مفتاح باب قفل صندوق كنز خريطة طريق سهم علامة لغز كلمة رقم لون فريق قائد لاعب دور تلميح بطاقة قاتل محايد عميل أحمر أزرق فوز نهاية بداية جولة غرفة لمة صديق هاتف
نظارة قبعة حذاء قميص معطف بنطال ساعة خاتم عقد عطر صابون منشفة مشط كرسي مكتب ورقة قلم حقيبة محفظة مفتاح هاتف شاحن سلك ضوء زر شاشة لعبة صورة
نهر جسر جزيرة قارب شراع ميناء صياد شبكة سمكة موجة عاصفة ضباب منارة شاطئ رمل صخرة محيط لؤلؤ مرجان حوت قرش سلحفاة دولفين أخطبوط
صاروخ كوكب رائد خوذة بدلة فضاء محطة مدار قمر شهاب نجمة مجرة ضوء ليزر روبوت جهاز زر شاشة خريطة مهمة قائد فريق إنذار خطر هبوط انطلاق
قصة بطل خصم نهاية بداية سر لغز رسالة باب قديم قلعة برج فارس سيف درع حصان راية ملكة ساحر تعويذة حجر كتاب نبوءة كنز كهف
سوق دكان بائع زبون سعر خصم كيس صندوق عربة ميزان فاكهة خضار عطر قماش ذهب فضة خاتم ساعة هدية لعبة حلوى
ملعب كرة هدف حكم صافرة جمهور مدرب خطة تمرير دفاع هجوم حارس كأس بطولة سباق مضمار فوز خسارة نقطة لاعب فريق
مستشفى طبيب ممرض غرفة دواء علاج إسعاف سرير جهاز فحص نبض قلب عظم عين أذن نفس صحة ألم شفاء
مدرسة طالب معلم درس سؤال جواب امتحان دفتر كتاب قلم سبورة حقيبة مكتبة لغة تاريخ رياضيات علوم فن
حديقة شجرة عصفور زهرة وردة عشب مقعد نافورة طفل لعبة طريق ظل شمس نسيم فراشة نحلة رائحة
مطار طائرة تذكرة جواز حقيبة بوابة مقعد نافذة طيار مضيف رحلة وجهة خريطة وقت وصول مغادرة
مطعم طاولة كرسي طبق قائمة طلب نادل مطبخ طباخ شوربة سلطة رز لحم دجاج سمك حلوى عصير
بيت عائلة مجلس ضيف قهوة شاي تمر باب نافذة غرفة سطح سلم مفتاح جدار مصباح سجادة
حاسوب تطبيق موقع غرفة لاعب خادم رسالة شبكة رمز ملف صورة صوت زر شاشة نافذة حساب
قائد فريق تخمين تلميح بطاقة عميل محايد قاتل أحمر أزرق دور نقطة قانون فوز خسارة لمة
`.trim().split(/\s+/);

const WORD_POOL = [...new Set([...WORDS, ...EXTRA_WORDS])];

const rooms = new Map();

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function roomCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  } while (rooms.has(code));
  return code;
}

function starterFrom(value) {
  if (value === "red" || value === "blue") return value;
  return Math.random() > 0.5 ? "red" : "blue";
}

function newGame(settings = {}) {
  const starter = starterFrom(settings.starter || "random");
  const second = starter === "red" ? "blue" : "red";
  const roles = shuffle([
    ...Array(9).fill(starter),
    ...Array(8).fill(second),
    ...Array(7).fill("neutral"),
    "assassin"
  ]);

  return {
    status: "lobby",
    board: shuffle(WORD_POOL).slice(0, 25).map((word, index) => ({
      id: `${Date.now()}-${index}-${Math.random().toString(16).slice(2)}`,
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
    log: [`الفريق ${starter === "red" ? "الأحمر" : "الأزرق"} يبدأ الجولة.`]
  };
}

function makeRoom(name, hostId, mode = "online") {
  const code = roomCode();
  const room = {
    code,
    name: name || "غرفة كود نيمز",
    hostId,
    settings: {
      starter: "random",
      mode: mode === "lamma" ? "lamma" : "online",
      lamma: {
        redName: "الفريق الأحمر",
        blueName: "الفريق الأزرق",
        redCaptain: "قائد الأحمر",
        blueCaptain: "قائد الأزرق",
        redPlayers: ["لاعب 1", "لاعب 2"],
        bluePlayers: ["لاعب 1", "لاعب 2"]
      }
    },
    players: new Map(),
    game: newGame({ starter: "random" })
  };
  rooms.set(code, room);
  return room;
}

function teamName(team) {
  return team === "red" ? "الأحمر" : "الأزرق";
}

function publicRoom(room, socketId) {
  const player = room.players.get(socketId);
  const canSeeMap = player?.role === "spymaster" || (room.settings.mode === "lamma" && room.hostId === socketId);
  return {
    code: room.code,
    name: room.name,
    hostId: room.hostId,
    me: socketId,
    settings: room.settings,
    players: [...room.players.values()],
    game: {
      ...room.game,
      board: room.game.board.map((card) => ({
        id: card.id,
        word: card.word,
        role: card.revealed || canSeeMap ? card.role : null,
        revealed: card.revealed
      }))
    }
  };
}

function emitRoom(room) {
  for (const id of room.players.keys()) {
    io.to(id).emit("room:state", publicRoom(room, id));
  }
}

function remaining(room, team) {
  return room.game.board.filter((card) => card.role === team && !card.revealed).length;
}

function finish(room, winner, message) {
  room.game.status = "ended";
  room.game.winner = winner;
  room.game.message = message;
  room.game.log.unshift(message);
}

function switchTurn(room, reason) {
  room.game.currentTeam = room.game.currentTeam === "red" ? "blue" : "red";
  room.game.hint = null;
  room.game.guessesMade = 0;
  room.game.guessLimit = 0;
  room.game.log.unshift(`${reason} الدور الآن للفريق ${teamName(room.game.currentTeam)}.`);
}

function canControlCurrentTeam(room, player) {
  if (!room || !player) return false;
  if (room.settings.mode === "lamma") return room.hostId === player.id;
  return player.team === room.game.currentTeam;
}

function canGiveHint(room, player) {
  if (!canControlCurrentTeam(room, player)) return false;
  if (room.settings.mode === "lamma") return room.hostId === player.id;
  return player.role === "spymaster";
}

function canReveal(room, player) {
  if (!canControlCurrentTeam(room, player)) return false;
  if (room.settings.mode === "lamma") return room.hostId === player.id;
  return player.role !== "spymaster";
}

io.on("connection", (socket) => {
  socket.on("room:create", ({ name, playerName, mode }, reply) => {
    const room = makeRoom(name, socket.id, mode);
    room.players.set(socket.id, {
      id: socket.id,
      name: playerName?.trim() || "لاعب",
      team: "red",
      role: room.settings.mode === "lamma" ? "spymaster" : "guesser",
      ready: false
    });
    socket.join(room.code);
    reply?.({ ok: true, code: room.code });
    emitRoom(room);
  });

  socket.on("lamma:setup", ({ code, setup }) => {
    const room = rooms.get(code);
    if (!room || room.hostId !== socket.id || room.settings.mode !== "lamma") return;
    const lamma = room.settings.lamma;
    const cleanList = (items, fallback) => {
      const list = Array.isArray(items)
        ? items.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 8)
        : [];
      return list.length ? list : fallback;
    };
    if (typeof setup?.redName === "string" && setup.redName.trim()) lamma.redName = setup.redName.trim().slice(0, 22);
    if (typeof setup?.blueName === "string" && setup.blueName.trim()) lamma.blueName = setup.blueName.trim().slice(0, 22);
    if (typeof setup?.redCaptain === "string" && setup.redCaptain.trim()) lamma.redCaptain = setup.redCaptain.trim().slice(0, 22);
    if (typeof setup?.blueCaptain === "string" && setup.blueCaptain.trim()) lamma.blueCaptain = setup.blueCaptain.trim().slice(0, 22);
    lamma.redPlayers = cleanList(setup?.redPlayers, lamma.redPlayers);
    lamma.bluePlayers = cleanList(setup?.bluePlayers, lamma.bluePlayers);
    room.game.log.unshift("تم تحديث إعدادات طور لمة.");
    emitRoom(room);
  });

  socket.on("room:join", ({ code, playerName }, reply) => {
    const room = rooms.get(String(code || "").trim().toUpperCase());
    if (!room) return reply?.({ ok: false, message: "رمز الغرفة غير صحيح." });
    room.players.set(socket.id, {
      id: socket.id,
      name: playerName?.trim() || "لاعب",
      team: null,
      role: "guesser",
      ready: false
    });
    socket.join(room.code);
    room.game.log.unshift(`${room.players.get(socket.id).name} دخل الغرفة.`);
    reply?.({ ok: true, code: room.code });
    emitRoom(room);
  });

  socket.on("player:update", ({ code, name, team, role, ready }) => {
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!room || !player) return;
    if (typeof name === "string" && name.trim()) player.name = name.trim().slice(0, 18);
    let changedSetup = false;
    if (team === "red" || team === "blue" || team === null) {
      changedSetup = player.team !== team;
      player.team = team;
    }
    if (role === "guesser" || role === "spymaster") {
      changedSetup = changedSetup || player.role !== role;
      player.role = role;
    }
    if (changedSetup) player.ready = false;
    if (typeof ready === "boolean") player.ready = ready;
    emitRoom(room);
  });

  socket.on("game:start", ({ code, starter }, reply) => {
    const room = rooms.get(code);
    if (!room) return;
    if (room.settings.mode === "online") {
      const hasRed = [...room.players.values()].some((p) => p.team === "red");
      const hasBlue = [...room.players.values()].some((p) => p.team === "blue");
      const redSpy = [...room.players.values()].some((p) => p.team === "red" && p.role === "spymaster");
      const blueSpy = [...room.players.values()].some((p) => p.team === "blue" && p.role === "spymaster");
      const redGuess = [...room.players.values()].some((p) => p.team === "red" && p.role === "guesser");
      const blueGuess = [...room.players.values()].some((p) => p.team === "blue" && p.role === "guesser");
      const allReady = [...room.players.values()].every((p) => p.team && p.ready);
      if (!hasRed || !hasBlue) return reply?.({ ok: false, message: "القانون الصارم: يجب وجود لاعب في كل فريق." });
      if (!redSpy || !blueSpy) return reply?.({ ok: false, message: "القانون الصارم: كل فريق يحتاج قائدًا قبل البداية." });
      if (!redGuess || !blueGuess) return reply?.({ ok: false, message: "القانون الصارم: كل فريق يحتاج لاعب تخمين واحد على الأقل." });
      if (!allReady) return reply?.({ ok: false, message: "الأونلاين يحتاج كل اللاعبين يختارون فريقهم ويضغطون جاهز." });
    } else if (room.hostId !== socket.id) {
      return reply?.({ ok: false, message: "طور لمة يبدأه صاحب الغرفة فقط." });
    }
    room.settings.starter = starter || room.settings.starter || "random";
    room.game = newGame({ starter: room.settings.starter });
    room.game.status = "playing";
    room.game.log.unshift(room.settings.mode === "lamma"
      ? "بدأ طور لمة. الجهاز يكون مع القائد عند التلميح، ثم يرجع للاعبين عند التخمين."
      : "بدأت الجولة. لا تجعل اللاعبين يرون خريطة القادة.");
    reply?.({ ok: true });
    emitRoom(room);
  });

  socket.on("game:new", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    room.game = newGame(room.settings);
    room.game.status = "playing";
    room.game.log.unshift("جولة جديدة بدأت.");
    emitRoom(room);
  });

  socket.on("game:hint", ({ code, word, number }, reply) => {
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.game.status !== "playing") return;
    if (!canGiveHint(room, player)) {
      return reply?.({ ok: false, message: "التلميح مسموح لقائد الفريق صاحب الدور فقط." });
    }
    const cleanWord = String(word || "").trim();
    const cleanNumber = Number(number);
    if (!cleanWord || !Number.isInteger(cleanNumber) || cleanNumber < 1 || cleanNumber > 9) {
      return reply?.({ ok: false, message: "اكتب كلمة ورقم من 1 إلى 9." });
    }
    room.game.hint = { word: cleanWord.slice(0, 20), number: cleanNumber };
    room.game.guessesMade = 0;
    room.game.guessLimit = cleanNumber + 1;
    room.game.log.unshift(`تلميح الفريق ${teamName(room.game.currentTeam)}: ${cleanWord} - ${cleanNumber}. مسموح ${cleanNumber + 1} تخمين كحد أقصى.`);
    reply?.({ ok: true });
    emitRoom(room);
  });

  socket.on("game:clearHint", ({ code }) => {
    const room = rooms.get(code);
    if (!room) return;
    room.game.hint = null;
    room.game.log.unshift("تم مسح التلميح.");
    emitRoom(room);
  });

  socket.on("game:endTurn", ({ code }) => {
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.game.status !== "playing") return;
    if (!canControlCurrentTeam(room, player)) return;
    switchTurn(room, `${player.name} أنهى الدور.`);
    emitRoom(room);
  });

  socket.on("game:reveal", ({ code, cardId }, reply) => {
    const room = rooms.get(code);
    const player = room?.players.get(socket.id);
    if (!room || !player || room.game.status !== "playing") return;
    if (!canReveal(room, player)) {
      return reply?.({ ok: false, message: "الكشف مسموح للاعبي الفريق صاحب الدور فقط." });
    }
    if (!room.game.hint) {
      return reply?.({ ok: false, message: "القانون الصارم: لا يمكن كشف بطاقة قبل إدخال تلميح." });
    }
    if (room.game.guessesMade >= room.game.guessLimit) {
      return reply?.({ ok: false, message: "انتهى عدد التخمينات المسموح لهذا الدور." });
    }
    const card = room.game.board.find((item) => item.id === cardId);
    if (!card || card.revealed) return;
    card.revealed = true;
    room.game.guessesMade += 1;
    room.game.log.unshift(`${player.name} كشف بطاقة "${card.word}".`);
    const actingTeam = room.game.currentTeam;
    if (card.role === "assassin") {
      finish(room, actingTeam === "red" ? "blue" : "red", `الفريق ${teamName(actingTeam)} كشف القاتل وخسر.`);
    } else if (remaining(room, "red") === 0) {
      finish(room, "red", "الفريق الأحمر فاز!");
    } else if (remaining(room, "blue") === 0) {
      finish(room, "blue", "الفريق الأزرق فاز!");
    } else if (card.role !== actingTeam) {
      switchTurn(room, card.role === "neutral" ? "بطاقة محايدة." : "بطاقة للفريق الآخر.");
    } else if (room.game.guessesMade >= room.game.guessLimit) {
      switchTurn(room, "وصل الفريق إلى الحد الأعلى للتخمينات.");
    }
    reply?.({ ok: true });
    emitRoom(room);
  });

  socket.on("disconnect", () => {
    for (const room of rooms.values()) {
      const player = room.players.get(socket.id);
      if (!player) continue;
      room.players.delete(socket.id);
      room.game.log.unshift(`${player.name} غادر الغرفة.`);
      if (room.hostId === socket.id) room.hostId = room.players.keys().next().value || null;
      if (room.players.size === 0) rooms.delete(room.code);
      else emitRoom(room);
      break;
    }
  });
});

server.listen(PORT, () => {
  console.log(`CODE NAMES Arabic is running on http://localhost:${PORT}`);
});
