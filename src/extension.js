/* extension.js
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * SPDX-License-Identifier: GPL-2.0-or-later
 */
import Clutter from 'gi://Clutter';
import Pango from 'gi://Pango';
import GObject from 'gi://GObject';
import IBus from 'gi://IBus';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';

// St.Side.BOTTOMのとき上に、St.Side.TOPのとき下に表示される
// そのため、prefs.jsの表示と逆にする必要がある
const positionOptions = [St.Side.BOTTOM, St.Side.TOP];

const PreeditHighlightPopup = GObject.registerClass({},
    class PreeditHighlightPopup extends BoxPointer.BoxPointer {
        _init(settings) {
            this._settings = settings;
            super._init(positionOptions[this._settings.get_uint('popup-position')]);

            this._settings.connect('changed::popup-position', (st, key) => {
                const arrowSide = positionOptions[st.get_uint(key)];
                this._userArrowSide = arrowSide;
                this.updateArrowSide(arrowSide);
            });

            this._dummyCursor = new Clutter.Actor({opacity: 0});
            Main.layoutManager.uiGroup.add_child(this._dummyCursor);
            Main.layoutManager.addTopChrome(this);

            const box = new St.BoxLayout({
                style_class: 'candidate-popup-content preedit-highlight-popup-content',
                vertical: false,
            });
            this.bin.set_child(box);

            this._preeditTextLabel = new St.Label({
                style_class: 'preedit-highlight-popup-text',
                visible: true,
            });

            // this._beforeTargetSegment = new St.Label({
            //     style_class: 'preedit-highlight-popup-non-target-text',
            //     visible: true,
            // });
            // this._targetSegment = new St.Label({
            //     style_class: 'preedit-highlight-popup-target-text',
            //     visible: true,
            // });
            // this._afterTargetSegment = new St.Label({
            //     style_class: 'preedit-highlight-popup-non-target-text',
            //     visible: true,
            // });
            box.add_child(this._preeditTextLabel);

            this._inputContext = null;

            this._onFocusWindowID = global.display.connect(
                'notify::focus-window', this._onFocusWindow.bind(this)
            );

            this._onCursorLocationChanged = Main.inputMethod.connect('cursor-location-changed', (_im, rect) => {
                if (this._visible || Main.inputMethod.hasPreedit())
                    this._setDummyCursorGeometry(rect.get_x(), rect.get_y(), rect.get_width(), rect.get_height());
            });

            this._preeditText = '';
            this._cursorPosition = 0;
            this._alignment = 0.0;
            this._visible = false;
            this._updateVisibility();

            this._encoder = new TextEncoder();
        }

        _onFocusWindow() {
            if (this._inputContext !== Main.inputMethod._context) {
                this._inputContext = Main.inputMethod._context;
                this._connectInputContext(Main.inputMethod._context);
            }
        }

        _setDummyCursorGeometry(x, y, w, h) {
            this._dummyCursor.set_position(Math.round(x), Math.round(y));
            this._dummyCursor.set_size(Math.round(w), Math.round(h));
            if (this._preeditText.length > 0)
                this._alignment = this._cursorPosition / this._preeditText.length;
            else
                this._alignment = 0.0;
            this.setPosition(this._dummyCursor, this._alignment);
        }

        _connectInputContext(inputContext) {
            if (!inputContext)
                return;

            this._updatePreeditTextWithModeID = inputContext.connect('update-preedit-text-with-mode', (_con, text, pos, _visible, _mode) => {
                this._setPreeditText(text, pos);
            });

            this._commitTextID = inputContext.connect('commit-text', (_con, _text) => {
                this._visible = false;
                this._updateVisibility();
            });
        }

        _setPreeditText(ibusText, pos) {
            const text = ibusText.get_text();
            this._cursorPosition = pos;
            let attrs = ibusText.get_attributes();
            let attr;
            let visible = false;

            const pangoAttrList = new Pango.AttrList();
            for (let i = 0; (attr = attrs.get(i)); ++i) {
                const start = this._encoder.encode(text.slice(0, attr.get_start_index())).byteLength;
                const end   = this._encoder.encode(text.slice(0, attr.get_end_index())).byteLength;
                const value = attr.get_value();
                let pangoAttr;

                switch (attr.get_attr_type()) {
                case IBus.AttrType.BACKGROUND: {
                    visible = true;
                    // int to rgb
                    const rgb = new Array(3);
                    for (let j = 2; j >= 0; j--) {
                        let t = value >> (8 * j) & 0xff;
                        rgb[2 - j] = (t << 8) | t;
                    }
                    pangoAttr = Pango.attr_background_new(...rgb);
                    break;
                }
                }

                if (pangoAttr) {
                    pangoAttr.start_index = start;
                    pangoAttr.end_index = end;
                    pangoAttrList.insert(pangoAttr);
                }
            }

            this._preeditText = text;
            this._visible = visible;
            if (visible) {
                this._preeditTextLabel.text = this._preeditText;
                this._preeditTextLabel.clutter_text.attributes = pangoAttrList;
            } else {
                this._preeditTextLabel.text = '';
            }

            this._updateVisibility();
        }

        _updateVisibility() {
            let isVisible = this._visible && Main.inputMethod.hasPreedit();

            if (isVisible) {
                this.setPosition(this._dummyCursor, this._alignment);
                this.open(BoxPointer.PopupAnimation.NONE);
                // fcitxの候補ウィンドウはtop_window_groupの位置に表示される
                // top_window_groupのすぐ下にポップアップを表示することで、候補ウィンドウが隠されなくなる
                this.get_parent().set_child_below_sibling(this, global.top_window_group);
            } else {
                this.close(BoxPointer.PopupAnimation.NONE);
            }
        }

        destroy() {
            this._settings = null;

            global.display.disconnect(this._onFocusWindowID);
            Main.inputMethod.disconnect(this._onCursorLocationChanged);

            if (this._updatePreeditTextWithModeID)
                this._inputContext.disconnect(this._updatePreeditTextWithModeID);

            if (this._commitTextID)
                this._inputContext.disconnect(this._commitTextID);

            this._dummyCursor.destroy();
            super.destroy();
        }
    });

export default class PreeditHighlightPopupExtension extends Extension {
    enable() {
        this._preeditHighlightPopup = new PreeditHighlightPopup(this.getSettings());
    }

    disable() {
        this._preeditHighlightPopup.destroy();
        delete this._preeditHighlightPopup;
    }
}

