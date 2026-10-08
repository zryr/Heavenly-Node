const { performance } = require('perf_hooks');

// Benchmark data generator
function generateTestData(categoryCount = 10, bookmarksPerCategory = 50) {
  const categories = [];
  const bookmarks = [];

  for (let c = 0; c < categoryCount; c++) {
    const catId = `cat_${c}`;
    categories.push({
      id: catId,
      title: `Category ${c}`,
      builtIn: c < 5,
      subSections: [
        { id: "builtin", title: "Built-In", builtIn: true },
        { id: "user", title: "Your Bookmarks", builtIn: true }
      ]
    });

    for (let b = 0; b < bookmarksPerCategory; b++) {
      const bmId = `bm_${c}_${b}`;
      const subBookmarks = [];
      for (let s = 0; s < 5; s++) {
        subBookmarks.push({
          id: `sub_${c}_${b}_${s}`,
          title: `Sub Bookmark ${s}`,
          url: `https://example.com/sub/${s}`,
          icon: ''
        });
      }

      bookmarks.push({
        id: bmId,
        categoryId: catId,
        title: `Bookmark ${c}-${b}`,
        url: `https://example.com/${c}/${b}`,
        type: b % 3 === 0 ? "folder_bookmark" : "bookmark",
        icon: "https://example.com/icon.png",
        builtIn: b < 30,
        subSectionId: b < 30 ? "builtin" : "user",
        subBookmarks: subBookmarks
      });
    }
  }

  // Ensure specific test ids exist
  bookmarks.push({ id: 'bm_ng', categoryId: 'cat_0', title: 'Newgrounds', url: 'https://newgrounds.com', type: 'folder_bookmark', icon: 'https://www.newgrounds.com/img/icons/favicon.ico', builtIn: true });
  bookmarks.push({ id: 'bm_user_ng', categoryId: 'cat_0', title: 'Newgrounds', url: 'https://newgrounds.com', type: 'folder_bookmark', icon: 'https://www.newgrounds.com/img/icons/favicon.ico', builtIn: false });

  return { categories, bookmarks };
}

const DEFAULT_BOOKMARK_DATA = generateTestData(10, 50);

function reconcileUnoptimized(storedData) {
  var data = JSON.parse(JSON.stringify(storedData));
  var updated = false;

  // Prune removed built-in categories and bookmarks
  var initialCatCount = data.categories.length;
  data.categories = data.categories.filter(function (cat) {
    if (!cat.builtIn) return true;
    return DEFAULT_BOOKMARK_DATA.categories.some(function (defCat) { return defCat.id === cat.id; });
  });
  if (data.categories.length !== initialCatCount) updated = true;

  var initialBmCount = data.bookmarks.length;
  data.bookmarks = data.bookmarks.filter(function (bm) {
    if (!bm.builtIn) return true;
    return DEFAULT_BOOKMARK_DATA.bookmarks.some(function (defBm) { return defBm.id === bm.id; });
  });
  if (data.bookmarks.length !== initialBmCount) updated = true;

  DEFAULT_BOOKMARK_DATA.categories.forEach(function (defCat) {
    var userCat = data.categories.find(function (c) { return c.id === defCat.id; });
    if (!userCat) {
      data.categories.push(JSON.parse(JSON.stringify(defCat)));
      updated = true;
    } else {
      if (!userCat.subSections || !Array.isArray(userCat.subSections)) {
        userCat.subSections = JSON.parse(JSON.stringify(defCat.subSections));
        updated = true;
      } else {
        defCat.subSections.forEach(function (defSub) {
          var userSub = userCat.subSections.find(function (s) { return s.id === defSub.id; });
          if (!userSub) {
            var userIdx = userCat.subSections.findIndex(function (s) { return s.id === 'user'; });
            if (userIdx !== -1) {
              userCat.subSections.splice(userIdx, 0, JSON.parse(JSON.stringify(defSub)));
            } else {
              userCat.subSections.push(JSON.parse(JSON.stringify(defSub)));
            }
            updated = true;
          } else if (defSub.builtIn && userSub.title !== defSub.title) {
            userSub.title = defSub.title;
            updated = true;
          }
        });
      }
    }
  });

  data.categories.forEach(function (cat) {
    if (!cat.subSections || !Array.isArray(cat.subSections)) {
      cat.subSections = [
        { id: "builtin", title: "Built-In", builtIn: true },
        { id: "user", title: "Your Bookmarks", builtIn: true }
      ];
      updated = true;
    }
  });

  // Migration: Update Newgrounds title/icon if needed
  var ngBm = data.bookmarks.find(function (b) { return b.id === 'bm_ng'; });
  if (ngBm) {
    if (ngBm.title !== 'Newgrounds: Syshi') {
      ngBm.title = 'Newgrounds: Syshi';
      updated = true;
    }
    if (ngBm.icon === 'https://www.newgrounds.com/img/icons/favicon.ico') {
      ngBm.icon = 'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64';
      updated = true;
    }
  }
  var userNgBm = data.bookmarks.find(function (b) { return b.id === 'bm_user_ng'; });
  if (userNgBm && userNgBm.icon === 'https://www.newgrounds.com/img/icons/favicon.ico') {
    userNgBm.icon = 'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64';
    updated = true;
  }

  // Migration: Remove pruned built-in bookmarks (like Anify)
  var initLen = data.bookmarks.length;
  data.bookmarks = data.bookmarks.filter(function (b) { return b.id !== 'bm_anify'; });
  if (data.bookmarks.length !== initLen) updated = true;

  // Migration: Re-sort built-in anime bookmarks so FMHY: Anime is under EverythingMoe and above AniSnatch
  var animeBms = data.bookmarks.filter(function (b) { return b.categoryId === 'cat_anime' && b.builtIn; });
  if (animeBms.length > 0) {
    var desiredAnimeOrder = ["bm_everythingmoe", "bm_fmhy_anime", "bm_anisnatch", "bm_miruro", "bm_aniclover", "bm_isshonime", "bm_anidb"];
    desiredAnimeOrder.forEach(function (id, index) {
      var found = animeBms.find(function (b) { return b.id === id; });
      if (found && found.order !== index) {
        found.order = index;
        updated = true;
      }
    });
  }

  data.bookmarks.forEach(function (bm) {
    if (!bm.subSectionId) {
      bm.subSectionId = bm.builtIn ? 'builtin' : 'user';
      updated = true;
    }
  });

  DEFAULT_BOOKMARK_DATA.bookmarks.forEach(function (defBm) {
    var userBm = data.bookmarks.find(function (b) { return b.id === defBm.id; });
    if (!userBm) {
      data.bookmarks.push(JSON.parse(JSON.stringify(defBm)));
      updated = true;
    } else {
      if (defBm.builtIn) {
        if (userBm.title !== defBm.title) {
          userBm.title = defBm.title;
          updated = true;
        }
        if (userBm.type !== defBm.type) {
          userBm.type = defBm.type;
          updated = true;
        }
        if (defBm.subSectionId && userBm.subSectionId !== defBm.subSectionId) {
          userBm.subSectionId = defBm.subSectionId;
          updated = true;
        }
        if (userBm.url !== defBm.url && defBm.url) {
          userBm.url = defBm.url;
          updated = true;
        }
        if (userBm.icon !== defBm.icon && defBm.icon) {
          userBm.icon = defBm.icon;
          updated = true;
        }
        if (defBm.disableQuickSaveWidget !== undefined && userBm.disableQuickSaveWidget !== defBm.disableQuickSaveWidget) {
          userBm.disableQuickSaveWidget = defBm.disableQuickSaveWidget;
          updated = true;
        }
      }
      if (!defBm.builtIn && (!userBm.icon || userBm.icon.trim() === '') && defBm.icon && defBm.icon.trim() !== '') {
        userBm.icon = defBm.icon;
        updated = true;
      }
      if (defBm.subBookmarks && Array.isArray(defBm.subBookmarks)) {
        if (!userBm.subBookmarks || !Array.isArray(userBm.subBookmarks)) {
          userBm.subBookmarks = [];
          updated = true;
        }
        if (defBm.builtIn) {
          var initSubLen = userBm.subBookmarks.length;
          userBm.subBookmarks = userBm.subBookmarks.filter(function (userSub) {
            return defBm.subBookmarks.some(function (defSub) { return defSub.id === userSub.id; });
          });
          if (userBm.subBookmarks.length !== initSubLen) updated = true;
        }
        defBm.subBookmarks.forEach(function (defSub) {
          var userSub = userBm.subBookmarks.find(function (s) { return s.id === defSub.id; });
          if (!userSub) {
            userBm.subBookmarks.push(JSON.parse(JSON.stringify(defSub)));
            updated = true;
          } else {
            if ((!userSub.icon || userSub.icon.trim() === '') && defSub.icon && defSub.icon.trim() !== '') {
              userSub.icon = defSub.icon;
              updated = true;
            }
          }
        });
      }
    }
  });

  return { data, updated };
}

function reconcileOptimized(storedData) {
  var data = JSON.parse(JSON.stringify(storedData));
  var updated = false;

  // Build map of DEFAULT_BOOKMARK_DATA built-in category IDs and bookmark IDs
  var defaultCatMap = Object.create(null);
  for (var i = 0; i < DEFAULT_BOOKMARK_DATA.categories.length; i++) {
    defaultCatMap[DEFAULT_BOOKMARK_DATA.categories[i].id] = DEFAULT_BOOKMARK_DATA.categories[i];
  }

  var defaultBmMap = Object.create(null);
  for (var i = 0; i < DEFAULT_BOOKMARK_DATA.bookmarks.length; i++) {
    defaultBmMap[DEFAULT_BOOKMARK_DATA.bookmarks[i].id] = DEFAULT_BOOKMARK_DATA.bookmarks[i];
  }

  // Prune removed built-in categories and bookmarks
  var initialCatCount = data.categories.length;
  data.categories = data.categories.filter(function (cat) {
    if (!cat.builtIn) return true;
    return Boolean(defaultCatMap[cat.id]);
  });
  if (data.categories.length !== initialCatCount) updated = true;

  var initialBmCount = data.bookmarks.length;
  data.bookmarks = data.bookmarks.filter(function (bm) {
    if (!bm.builtIn) return true;
    return Boolean(defaultBmMap[bm.id]);
  });
  if (data.bookmarks.length !== initialBmCount) updated = true;

  // Build map of user stored categories by ID
  var userCatMap = Object.create(null);
  for (var i = 0; i < data.categories.length; i++) {
    userCatMap[data.categories[i].id] = data.categories[i];
  }

  DEFAULT_BOOKMARK_DATA.categories.forEach(function (defCat) {
    var userCat = userCatMap[defCat.id];
    if (!userCat) {
      userCat = JSON.parse(JSON.stringify(defCat));
      data.categories.push(userCat);
      userCatMap[defCat.id] = userCat;
      updated = true;
    } else {
      if (!userCat.subSections || !Array.isArray(userCat.subSections)) {
        userCat.subSections = JSON.parse(JSON.stringify(defCat.subSections));
        updated = true;
      } else {
        var userSubMap = Object.create(null);
        for (var k = 0; k < userCat.subSections.length; k++) {
          userSubMap[userCat.subSections[k].id] = userCat.subSections[k];
        }
        defCat.subSections.forEach(function (defSub) {
          var userSub = userSubMap[defSub.id];
          if (!userSub) {
            var userIdx = userCat.subSections.findIndex(function (s) { return s.id === 'user'; });
            var newSub = JSON.parse(JSON.stringify(defSub));
            if (userIdx !== -1) {
              userCat.subSections.splice(userIdx, 0, newSub);
            } else {
              userCat.subSections.push(newSub);
            }
            userSubMap[defSub.id] = newSub;
            updated = true;
          } else if (defSub.builtIn && userSub.title !== defSub.title) {
            userSub.title = defSub.title;
            updated = true;
          }
        });
      }
    }
  });

  data.categories.forEach(function (cat) {
    if (!cat.subSections || !Array.isArray(cat.subSections)) {
      cat.subSections = [
        { id: "builtin", title: "Built-In", builtIn: true },
        { id: "user", title: "Your Bookmarks", builtIn: true }
      ];
      updated = true;
    }
  });

  // Build map of stored user bookmarks by ID
  var userBmMap = Object.create(null);
  for (var i = 0; i < data.bookmarks.length; i++) {
    userBmMap[data.bookmarks[i].id] = data.bookmarks[i];
  }

  // Migration: Update Newgrounds title/icon if needed
  var ngBm = userBmMap['bm_ng'];
  if (ngBm) {
    if (ngBm.title !== 'Newgrounds: Syshi') {
      ngBm.title = 'Newgrounds: Syshi';
      updated = true;
    }
    if (ngBm.icon === 'https://www.newgrounds.com/img/icons/favicon.ico') {
      ngBm.icon = 'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64';
      updated = true;
    }
  }
  var userNgBm = userBmMap['bm_user_ng'];
  if (userNgBm && userNgBm.icon === 'https://www.newgrounds.com/img/icons/favicon.ico') {
    userNgBm.icon = 'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64';
    updated = true;
  }

  // Migration: Remove pruned built-in bookmarks (like Anify)
  if (userBmMap['bm_anify']) {
    data.bookmarks = data.bookmarks.filter(function (b) { return b.id !== 'bm_anify'; });
    delete userBmMap['bm_anify'];
    updated = true;
  }

  // Migration: Re-sort built-in anime bookmarks so FMHY: Anime is under EverythingMoe and above AniSnatch
  var animeBms = data.bookmarks.filter(function (b) { return b.categoryId === 'cat_anime' && b.builtIn; });
  if (animeBms.length > 0) {
    var animeBmMap = Object.create(null);
    for (var i = 0; i < animeBms.length; i++) {
      animeBmMap[animeBms[i].id] = animeBms[i];
    }
    var desiredAnimeOrder = ["bm_everythingmoe", "bm_fmhy_anime", "bm_anisnatch", "bm_miruro", "bm_aniclover", "bm_isshonime", "bm_anidb"];
    desiredAnimeOrder.forEach(function (id, index) {
      var found = animeBmMap[id];
      if (found && found.order !== index) {
        found.order = index;
        updated = true;
      }
    });
  }

  data.bookmarks.forEach(function (bm) {
    if (!bm.subSectionId) {
      bm.subSectionId = bm.builtIn ? 'builtin' : 'user';
      updated = true;
    }
  });

  DEFAULT_BOOKMARK_DATA.bookmarks.forEach(function (defBm) {
    var userBm = userBmMap[defBm.id];
    if (!userBm) {
      var newBm = JSON.parse(JSON.stringify(defBm));
      data.bookmarks.push(newBm);
      userBmMap[defBm.id] = newBm;
      updated = true;
    } else {
      if (defBm.builtIn) {
        if (userBm.title !== defBm.title) {
          userBm.title = defBm.title;
          updated = true;
        }
        if (userBm.type !== defBm.type) {
          userBm.type = defBm.type;
          updated = true;
        }
        if (defBm.subSectionId && userBm.subSectionId !== defBm.subSectionId) {
          userBm.subSectionId = defBm.subSectionId;
          updated = true;
        }
        if (userBm.url !== defBm.url && defBm.url) {
          userBm.url = defBm.url;
          updated = true;
        }
        if (userBm.icon !== defBm.icon && defBm.icon) {
          userBm.icon = defBm.icon;
          updated = true;
        }
        if (defBm.disableQuickSaveWidget !== undefined && userBm.disableQuickSaveWidget !== defBm.disableQuickSaveWidget) {
          userBm.disableQuickSaveWidget = defBm.disableQuickSaveWidget;
          updated = true;
        }
      }
      if (!defBm.builtIn && (!userBm.icon || userBm.icon.trim() === '') && defBm.icon && defBm.icon.trim() !== '') {
        userBm.icon = defBm.icon;
        updated = true;
      }
      if (defBm.subBookmarks && Array.isArray(defBm.subBookmarks)) {
        if (!userBm.subBookmarks || !Array.isArray(userBm.subBookmarks)) {
          userBm.subBookmarks = [];
          updated = true;
        }
        var defSubMap = Object.create(null);
        for (var s = 0; s < defBm.subBookmarks.length; s++) {
          defSubMap[defBm.subBookmarks[s].id] = defBm.subBookmarks[s];
        }

        if (defBm.builtIn) {
          var initSubLen = userBm.subBookmarks.length;
          userBm.subBookmarks = userBm.subBookmarks.filter(function (userSub) {
            return Boolean(defSubMap[userSub.id]);
          });
          if (userBm.subBookmarks.length !== initSubLen) updated = true;
        }

        var userSubBmMap = Object.create(null);
        for (var s = 0; s < userBm.subBookmarks.length; s++) {
          userSubBmMap[userBm.subBookmarks[s].id] = userBm.subBookmarks[s];
        }

        defBm.subBookmarks.forEach(function (defSub) {
          var userSub = userSubBmMap[defSub.id];
          if (!userSub) {
            var newSub = JSON.parse(JSON.stringify(defSub));
            userBm.subBookmarks.push(newSub);
            userSubBmMap[defSub.id] = newSub;
            updated = true;
          } else {
            if ((!userSub.icon || userSub.icon.trim() === '') && defSub.icon && defSub.icon.trim() !== '') {
              userSub.icon = defSub.icon;
              updated = true;
            }
          }
        });
      }
    }
  });

  return { data, updated };
}

// Verification that output of both functions is identical
const testStoredData = generateTestData(10, 50);
const res1 = reconcileUnoptimized(testStoredData);
const res2 = reconcileOptimized(testStoredData);

if (JSON.stringify(res1.data) !== JSON.stringify(res2.data)) {
  console.error("ERROR: Outputs do not match!");
  process.exit(1);
} else {
  console.log("SUCCESS: Outputs match perfectly.");
}

// Benchmark execution
const ITERATIONS = 100;

console.log(`Running benchmark with ${ITERATIONS} iterations on 500 bookmarks...`);

const start1 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  reconcileUnoptimized(testStoredData);
}
const end1 = performance.now();
const timeUnoptimized = end1 - start1;

const start2 = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  reconcileOptimized(testStoredData);
}
const end2 = performance.now();
const timeOptimized = end2 - start2;

const speedup = ((timeUnoptimized - timeOptimized) / timeUnoptimized * 100).toFixed(2);

console.log(`Unoptimized Time: ${timeUnoptimized.toFixed(2)} ms`);
console.log(`Optimized Time:   ${timeOptimized.toFixed(2)} ms`);
console.log(`Speedup:          ${speedup}% faster`);
