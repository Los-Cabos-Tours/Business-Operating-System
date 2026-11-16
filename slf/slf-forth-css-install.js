// Re-attaches the board CSS installer. The v3 panel rewrite
// removed the one line that defines SLFBoard.css, so the client
// profile rendered unstyled/broken. This restores it in a small
// standalone file: combine part A + part B.
'use strict';
SLFBoard.css = function () { return SLFBoard.__cssA + SLFBoard.__cssB; };
