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
    welcomeText: document.getElementById("welcomeText"),
  };

  var byPrn = {};
  STUDENTS.forEach(function (s) {
    byPrn[s.prn.toUpperCase()] = s;
  });

  if (typeof INSTITUTION_NAME === "string") {
    document.title = INSTITUTION_NAME + " — Orientation";
  }

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
      var moreLi = document.createElement("li");
      moreLi.className = "suggestions-more";
      moreLi.textContent =
        "+" + (students.length - SUGGESTION_LIMIT) + " more match" +
        (students.length - SUGGESTION_LIMIT === 1 ? "" : "es") +
        " — type more of the name or PRN to narrow it down";
      els.suggestions.appendChild(moreLi);
    }

    els.suggestions.hidden = students.length === 0;
  }

  function hideResult() {
    els.resultCard.hidden = true;
  }

  function displayStudent(student) {
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
    els.detailParentRoom.textContent = (programRooms && programRooms.parent) || "Check Registration Desk";

    var schedule = GROUP_SCHEDULE[student.group] || [];
    els.scheduleList.innerHTML = "";
    if (schedule.length === 0) {
      var li = document.createElement("li");
      li.className = "schedule-item";
      li.innerHTML = '<div class="schedule-body"><span class="schedule-activity">Schedule not available for your group yet.</span><span class="schedule-location">Please check with the Registration Desk.</span></div>';
      els.scheduleList.appendChild(li);
    } else {
      schedule.forEach(function (item) {
        var li = document.createElement("li");
        li.className = "schedule-item";

        var time = document.createElement("div");
        time.className = "schedule-time";
        time.textContent = item.time;

        var body = document.createElement("div");
        body.className = "schedule-body";

        var activity = document.createElement("span");
        activity.className = "schedule-activity";
        activity.textContent = item.activity;
        body.appendChild(activity);

        var location = item.useProgramRoom
          ? (programRooms && programRooms.student) || "Check Registration Desk"
          : item.location;
        if (location) {
          var locationEl = document.createElement("span");
          locationEl.className = "schedule-location";
          locationEl.textContent = location;
          body.appendChild(locationEl);
        }

        li.appendChild(time);
        li.appendChild(body);
        els.scheduleList.appendChild(li);
      });
    }

    var institution = typeof INSTITUTION_NAME === "string" ? INSTITUTION_NAME : "our campus";
    els.welcomeText.textContent =
      "Welcome, " + student.name + "! We're delighted to have you join " +
      institution + ". Head to your Group " + (student.group || "") +
      " activities and have a wonderful orientation day!";

    els.resultCard.hidden = false;
    els.resultCard.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function runSearch(rawQuery) {
    var query = (rawQuery || "").trim();
    hideSuggestions();

    if (!query) {
      showMessage("Please enter your PRN or Name to search.", "info");
      hideResult();
      return;
    }

    var byPrnMatch = findByPrn(query);
    if (byPrnMatch) {
      displayStudent(byPrnMatch);
      return;
    }

    var matches = findMatches(query);
    if (matches.length === 1) {
      displayStudent(matches[0]);
      return;
    }

    if (matches.length > 1) {
      hideResult();
      showMessage(
        matches.length + " students matched “" + query + "”. Select yours from the list below.",
        "info"
      );
      showSuggestions(matches);
      return;
    }

    hideResult();
    showMessage(
      "No student found for “" + query + "”. Please check the spelling, or try your PRN instead. If the issue persists, visit the Registration Desk.",
      "error"
    );
  }

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
