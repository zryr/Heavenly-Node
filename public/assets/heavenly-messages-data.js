/* Generated from heavenly-messages.json. Run node scripts/build-messages.cjs; do not edit. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.HeavenlyMessagesData = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  return {
  "schema": 1,
  "version": "2026.10.25.1",
  "items": [
    {
      "id": "msg_homework",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "Doing anything but homework...",
      "segments": [
        {
          "text": "Doing anything but homework..."
        }
      ],
      "action": null
    },
    {
      "id": "msg_gatekeep",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "“We gotta gatekeep this site.” — some guy",
      "segments": [
        {
          "text": "“We gotta gatekeep this site.” — some guy"
        }
      ],
      "action": null
    },
    {
      "id": "msg_blocked",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "All of these links getting blocked...",
      "segments": [
        {
          "text": "All of these links getting blocked..."
        }
      ],
      "action": null
    },
    {
      "id": "msg_go",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "What are you still doing here? Go use the site.",
      "segments": [
        {
          "text": "What are you still doing here? Go use the site."
        }
      ],
      "action": null
    },
    {
      "id": "msg_week",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "All of this just to get blocked in a week.",
      "segments": [
        {
          "text": "All of this just to get blocked in a week."
        }
      ],
      "action": null
    },
    {
      "id": "msg_know",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "spark",
      "reducedMotionText": "Those who know this website...",
      "segments": [
        {
          "text": "Those who know this website..."
        }
      ],
      "action": null
    },
    {
      "id": "msg_heavenly",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "“Everything I do is Heavenly.” — Syshi",
      "segments": [
        {
          "text": "“Everything I do is "
        },
        {
          "text": "Heavenly.",
          "emphasis": true,
          "gradient": "heavenly"
        },
        {
          "text": "” — Syshi"
        }
      ],
      "action": null
    },
    {
      "id": "msg_viewer",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "Psst... the HTML Viewer has something special.",
      "segments": [
        {
          "text": "Psst... the "
        },
        {
          "text": "HTML Viewer",
          "link": "/html-viewer.html",
          "emphasis": true,
          "tooltip": "Write HTML and run it in an isolated preview."
        },
        {
          "text": " has something special."
        }
      ],
      "action": null
    },
    {
      "id": "msg_resize",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "You can resize the left and right bookmark panels by dragging their inner edges.",
      "segments": [
        {
          "text": "You can resize the left and right bookmark panels by dragging their inner edges."
        }
      ],
      "action": null
    },
    {
      "id": "msg_search",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "Looking for a bookmark? Search folders, categories, and links above.",
      "segments": [
        {
          "text": "Looking for a bookmark? Search folders, categories, and links above."
        }
      ],
      "action": null
    },
    {
      "id": "msg_bookmarks",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "Your bookmarks, your order. Drag a link to put it where you want.",
      "segments": [
        {
          "text": "Your bookmarks, your order. Drag a link to put it where you want."
        }
      ],
      "action": null
    },
    {
      "id": "msg_layout",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "Need more room? Collapse a side panel with the layout controls.",
      "segments": [
        {
          "text": "Need more room? Collapse a side panel with the layout controls."
        }
      ],
      "action": null
    },
    {
      "id": "msg_settings",
      "kind": "ordinary",
      "enabled": true,
      "weight": 1,
      "theme": "default",
      "animation": "soft",
      "icon": "none",
      "reducedMotionText": "Make Heavenly feel like yours in Settings.",
      "segments": [
        {
          "text": "Make Heavenly feel like yours in "
        },
        {
          "text": "Settings",
          "link": "/settings.html",
          "tooltip": "Adjust layout, launch, privacy, and widget preferences."
        },
        {
          "text": "."
        }
      ],
      "action": null
    },
    {
      "id": "msg_aura",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "music",
      "animation": "sheen",
      "icon": "headphones",
      "reducedMotionText": "A little Aura Phonk for the background?",
      "segments": [
        {
          "text": "A little Aura Phonk for the background?",
          "emphasis": true,
          "gradient": "monochrome"
        }
      ],
      "action": {
        "type": "playlist",
        "playlist": "aura"
      }
    },
    {
      "id": "msg_hardstyle",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "music",
      "animation": "sheen",
      "icon": "headphones",
      "reducedMotionText": "Turn the energy up. Hardstyle?",
      "segments": [
        {
          "text": "Turn the energy up. Hardstyle?",
          "emphasis": true,
          "gradient": "monochrome"
        }
      ],
      "action": {
        "type": "playlist",
        "playlist": "hardstyle"
      }
    },
    {
      "id": "msg_hardtekk",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "music",
      "animation": "sheen",
      "icon": "headphones",
      "reducedMotionText": "A different kind of energy. Hardtekk?",
      "segments": [
        {
          "text": "A different kind of energy. Hardtekk?",
          "emphasis": true,
          "gradient": "monochrome"
        }
      ],
      "action": {
        "type": "playlist",
        "playlist": "hardtekk"
      }
    },
    {
      "id": "msg_favorites",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "gold",
      "animation": "sheen",
      "icon": "headphones",
      "reducedMotionText": "A few of Syshi’s Favorite Songs.",
      "segments": [
        {
          "text": "A few of Syshi’s Favorite Songs.",
          "emphasis": true,
          "gradient": "gold"
        }
      ],
      "action": {
        "type": "playlist",
        "playlist": "favorites"
      }
    },
    {
      "id": "msg_purple_hulk",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "purple",
      "animation": "soft",
      "icon": "cloud",
      "reducedMotionText": "Ao Oni = Big Purple Hulk.",
      "segments": [
        {
          "text": "Ao Oni = Big Purple Hulk."
        }
      ],
      "action": {
        "type": "scene",
        "scene": "purple-hulk",
        "steps": [
          {
            "speaker": "You",
            "text": "Ao Oni = Big Purple Hulk?",
            "asset": "ao-side"
          },
          {
            "speaker": "Cloudy",
            "text": "That’s the joke. He’s purple, he’s big, and he has opinions.",
            "asset": "ao-side"
          }
        ]
      }
    },
    {
      "id": "msg_ao_oni",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "purple",
      "animation": "soft",
      "icon": "cloud",
      "reducedMotionText": "Cloudy has a very important question.",
      "segments": [
        {
          "text": "Cloudy has a very important question."
        }
      ],
      "action": {
        "type": "scene",
        "scene": "ao-oni",
        "steps": [
          {
            "speaker": "You",
            "text": "What is an Ao Oni?",
            "asset": "ao-side"
          },
          {
            "speaker": "Cloudy",
            "text": "You don’t know ball...",
            "asset": "anger"
          },
          {
            "speaker": "Cloudy",
            "text": "Let me introduce you.",
            "asset": "ao-dance"
          }
        ]
      }
    },
    {
      "id": "msg_khezu",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "cutoff",
      "animation": "soft",
      "icon": "cloud",
      "reducedMotionText": "Khezu would like a word.",
      "segments": [
        {
          "text": "Khezu would like a word."
        }
      ],
      "action": {
        "type": "scene",
        "scene": "khezu",
        "steps": [
          {
            "speaker": "You",
            "text": "So, could I use it for—",
            "asset": "khezu"
          },
          {
            "speaker": "Cloudy",
            "text": "No, you can’t use it for that.",
            "asset": "khezu"
          }
        ]
      }
    },
    {
      "id": "msg_doggy",
      "kind": "special",
      "enabled": true,
      "weight": 1,
      "theme": "warm",
      "animation": "soft",
      "icon": "cloud",
      "reducedMotionText": "A tiny break with Syshi’s Doggy.",
      "segments": [
        {
          "text": "A tiny break with Syshi’s Doggy."
        }
      ],
      "action": {
        "type": "scene",
        "scene": "doggy",
        "steps": [
          {
            "speaker": "Cloudy",
            "text": "You’ve been browsing for a while. Doggy saved you a seat.",
            "asset": "doggy"
          },
          {
            "speaker": "You",
            "text": "Okay. One tiny break.",
            "asset": "doggy"
          },
          {
            "speaker": "Cloudy",
            "text": "Take your time. Your bookmarks will be here.",
            "asset": "doggy"
          }
        ]
      }
    }
  ]
};
}));
