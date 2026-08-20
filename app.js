(function () {
  "use strict";

  var els = {
    form: document.getElementById("searchForm"),
    input: document.getElementById("searchInput"),
    clearBtn: document.getElementById("clearBtn"),
    suggestions: document.getElementById("suggestions"),
    messageArea: document.getElementById("messageArea"),
    idleHint: document.getElementById("idleHint"),
    resultCard: document.getElementById("resultCard"),
    groupBadge: document.getElementById("groupBadge"),
    studentName: document.getElementById("studentName"),
    studentPrn: document.getElementById("studentPrn"),
    studentProgram: document.getElementById("studentProgram"),
    detailGroup: document.getElementById("detailGroup"),
    detailPrn: document.getElementById("detailPrn"),
    detailProgram: document.getElementById("detailProgram"),
    detailParentRoom: document.getElementById("detailParentRoom"),
    scheduleList: document.getElementById("scheduleList"),
    parentScheduleList: document.getElementById("parentScheduleList"),
    welcomeText: document.getElementById("welcomeText"),
    captureArea: document.getElementById("captureArea"),
    saveImageBtn: document.getElementById("saveImageBtn"),
  };

  var currentStudent = null;

  var byPrn = {};
  STUDENTS.forEach(function (s) {
    byPrn[s.prn.toUpperCase()] = s;
  });

  var englishInstitutionName = typeof INSTITUTION_NAME === "string" ? INSTITUTION_NAME : null;
  var currentLang = I18N.getLang();
  var langButtons = document.querySelectorAll(".lang-btn");

  function t(key, params) {
    return I18N.t(currentLang, key, params);
  }

  function applyStaticTranslations() {
    document.documentElement.lang = currentLang;

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      if (el === els.saveImageBtn && el.disabled) return; // mid-save; busy label owns the text for now
      el.innerHTML = t(el.getAttribute("data-i18n"));
    });
    document.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria-label")));
    });

    document.title = I18N.getInstitutionName(currentLang, englishInstitutionName) + t("titleSuffix");

    langButtons.forEach(function (btn) {
      btn.classList.toggle("active", btn.getAttribute("data-lang") === currentLang);
    });
  }

  function setLanguage(lang) {
    if (lang === currentLang) return;
    currentLang = lang;
    I18N.setLang(lang);
    applyStaticTranslations();

    var query = els.input.value.trim();
    if (query) {
      runSearch(query, { scroll: false });
    }
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      setLanguage(btn.getAttribute("data-lang"));
    });
  });

  applyStaticTranslations();

  function normalize(text) {
    return (text || "").toString().trim().toLowerCase().replace(/\s+/g, " ");
  }

  function findByPrn(query) {
    return byPrn[query.trim().toUpperCase()] || null;
  }

  function matchRank(student, qUpper, qLower) {
    var prnUpper = student.prn.toUpperCase();
    var nameLower = normalize(student.name);
    if (prnUpper === qUpper) return 0;
    if (prnUpper.indexOf(qUpper) === 0) return 1;
    if (nameLower.indexOf(qLower) === 0) return 2;
    if (prnUpper.indexOf(qUpper) !== -1) return 3;
    if (nameLower.indexOf(qLower) !== -1) return 4;
    return 5;
  }

  // Matches on PRN (anywhere in the PRN, not just an exact match) as well
  // as name, so partial/mistyped PRNs still suggest the closest students.
  function findMatches(query) {
    var qUpper = query.trim().toUpperCase();
    var qLower = normalize(query);
    if (!qUpper) return [];

    var results = STUDENTS.filter(function (s) {
      return s.prn.toUpperCase().indexOf(qUpper) !== -1 || normalize(s.name).indexOf(qLower) !== -1;
    });

    results.sort(function (a, b) {
      return matchRank(a, qUpper, qLower) - matchRank(b, qUpper, qLower);
    });

    return results;
  }

  function showMessage(text, type) {
    els.messageArea.textContent = text;
    els.messageArea.className = "message-area " + (type || "info");
    els.messageArea.hidden = false;
  }

  function hideMessage() {
    els.messageArea.hidden = true;
  }

  function hideSuggestions() {
    els.suggestions.hidden = true;
    els.suggestions.innerHTML = "";
  }

  var SUGGESTION_LIMIT = 8;

  function showSuggestions(students) {
    els.suggestions.innerHTML = "";
    students.slice(0, SUGGESTION_LIMIT).forEach(function (s) {
      var li = document.createElement("li");
      li.setAttribute("role", "option");
      li.tabIndex = 0;

      var mainDiv = document.createElement("div");
      mainDiv.className = "suggestion-main";

      var nameSpan = document.createElement("span");
      nameSpan.className = "suggestion-name";
      nameSpan.textContent = s.name;

      var metaSpan = document.createElement("span");
      metaSpan.className = "suggestion-meta";
      metaSpan.textContent = s.prn + " · " + s.program;

      mainDiv.appendChild(nameSpan);
      mainDiv.appendChild(metaSpan);

      var groupSpan = document.createElement("span");
      groupSpan.className = "suggestion-group";
      groupSpan.textContent = s.group;

      li.appendChild(mainDiv);
      li.appendChild(groupSpan);

      function select() {
        els.input.value = s.name;
        hideSuggestions();
        displayStudent(s);
      }
      li.addEventListener("click", select);
      li.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          select();
        }
      });

      els.suggestions.appendChild(li);
    });

    if (students.length > SUGGESTION_LIMIT) {
      var remaining = students.length - SUGGESTION_LIMIT;
      var moreLi = document.createElement("li");
      moreLi.className = "suggestions-more";
      moreLi.textContent = t(remaining === 1 ? "moreMatchesOne" : "moreMatchesOther", { count: remaining });
      els.suggestions.appendChild(moreLi);
    }

    els.suggestions.hidden = students.length === 0;
  }

  function hideResult() {
    els.resultCard.hidden = true;
  }

  function renderScheduleList(container, items, resolveLocation, emptyMessage) {
    container.innerHTML = "";
    if (items.length === 0) {
      var emptyLi = document.createElement("li");
      emptyLi.className = "schedule-item";
      emptyLi.innerHTML =
        '<div class="schedule-body"><span class="schedule-activity">' +
        emptyMessage +
        "</span></div>";
      container.appendChild(emptyLi);
      return;
    }

    items.forEach(function (item) {
      var li = document.createElement("li");
      li.className = "schedule-item";

      var time = document.createElement("div");
      time.className = "schedule-time";
      time.textContent = item.time;

      var body = document.createElement("div");
      body.className = "schedule-body";

      var activity = document.createElement("span");
      activity.className = "schedule-activity";
      activity.textContent = I18N.translateActivity(item.activity, currentLang);
      body.appendChild(activity);

      var location = resolveLocation ? resolveLocation(item) : I18N.translateLocation(item.location, currentLang);
      if (location) {
        var locationEl = document.createElement("span");
        locationEl.className = "schedule-location";
        locationEl.textContent = location;
        body.appendChild(locationEl);
      }

      li.appendChild(time);
      li.appendChild(body);
      container.appendChild(li);
    });
  }

  function displayStudent(student, opts) {
    opts = opts || {};
    currentStudent = student;
    hideMessage();
    hideSuggestions();
    els.idleHint.hidden = true;

    els.groupBadge.textContent = student.group || "—";
    els.studentName.textContent = student.name;
    els.studentPrn.textContent = student.prn;
    els.studentProgram.textContent = student.program;

    els.detailGroup.textContent = student.group || "—";
    els.detailPrn.textContent = student.prn;
    els.detailProgram.textContent = student.program || "—";

    var programRooms = (typeof ROOM_BY_PROGRAM === "object" && ROOM_BY_PROGRAM[student.program]) || null;
    els.detailParentRoom.textContent =
      (programRooms && I18N.translateLocation(programRooms.parent, currentLang)) || t("checkRegistrationDesk");

    var schedule = GROUP_SCHEDULE[student.group] || [];
    renderScheduleList(
      els.scheduleList,
      schedule,
      function (item) {
        return item.useProgramRoom
          ? (programRooms && I18N.translateLocation(programRooms.student, currentLang)) || t("checkRegistrationDesk")
          : I18N.translateLocation(item.location, currentLang);
      },
      t("scheduleNotAvailable")
    );

    renderScheduleList(
      els.parentScheduleList,
      typeof PARENT_SESSIONS === "object" ? PARENT_SESSIONS : [],
      null,
      t("parentSessionsAnnounced")
    );

    var institution = I18N.getInstitutionName(currentLang, englishInstitutionName);
    els.welcomeText.textContent = t("welcomeMessage", {
      name: student.name,
      institution: institution,
      group: student.group || ""
    });

    els.resultCard.hidden = false;
    if (opts.scroll !== false) {
      els.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function runSearch(rawQuery, opts) {
    opts = opts || {};
    var query = (rawQuery || "").trim();
    hideSuggestions();

    if (!query) {
      showMessage(t("promptEnterQuery"), "info");
      hideResult();
      return;
    }

    var byPrnMatch = findByPrn(query);
    if (byPrnMatch) {
      displayStudent(byPrnMatch, opts);
      return;
    }

    var matches = findMatches(query);
    if (matches.length === 1) {
      displayStudent(matches[0], opts);
      return;
    }

    if (matches.length > 1) {
      hideResult();
      showMessage(t("matchedStudents", { count: matches.length, query: query }), "info");
      showSuggestions(matches);
      return;
    }

    hideResult();
    showMessage(t("noStudentFound", { query: query }), "error");
  }

  function saveResultAsImage() {
    if (!currentStudent || typeof html2canvas !== "function") return;

    els.saveImageBtn.disabled = true;
    var restoreLabel = t("saveImageButton");
    els.saveImageBtn.textContent = t("saveImageButtonBusy");

    var fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();

    fontsReady
      .then(function () {
        return html2canvas(els.captureArea, {
          backgroundColor: "#ffffff",
          scale: Math.max(2, window.devicePixelRatio || 1),
          useCORS: true,
        });
      })
      .then(function (canvas) {
        var link = document.createElement("a");
        link.href = canvas.toDataURL("image/jpeg", 0.92);
        link.download = currentStudent.prn + "-orientation-details.jpg";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      })
      .catch(function () {
        showMessage(t("saveImageError"), "error");
      })
      .finally(function () {
        els.saveImageBtn.disabled = false;
        els.saveImageBtn.textContent = restoreLabel;
      });
  }

  els.saveImageBtn.addEventListener("click", saveResultAsImage);

  els.form.addEventListener("submit", function (e) {
    e.preventDefault();
    runSearch(els.input.value);
  });

  els.input.addEventListener("input", function () {
    var query = els.input.value.trim();
    els.clearBtn.hidden = query.length === 0;

    if (query.length < 2) {
      hideSuggestions();
      return;
    }

    var prnMatch = findByPrn(query);
    if (prnMatch) {
      displayStudent(prnMatch);
      return;
    }

    var matches = findMatches(query);
    if (matches.length > 0) {
      showSuggestions(matches);
    } else {
      hideSuggestions();
    }
  });

  els.input.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      hideSuggestions();
    }
  });

  els.clearBtn.addEventListener("click", function () {
    els.input.value = "";
    els.clearBtn.hidden = true;
    hideSuggestions();
    hideMessage();
    hideResult();
    els.idleHint.hidden = false;
    els.input.focus();
  });

  document.addEventListener("click", function (e) {
    if (!els.suggestions.contains(e.target) && e.target !== els.input) {
      hideSuggestions();
    }
  });
})();
