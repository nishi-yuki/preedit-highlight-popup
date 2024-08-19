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
import GObject from 'gi://GObject';
import IBus from 'gi://IBus';
import St from 'gi://St';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as BoxPointer from 'resource:///org/gnome/shell/ui/boxpointer.js';
import {getIBusManager} from 'resource:///org/gnome/shell/misc/ibusManager.js';

const PreeditHighlightPopup = GObject.registerClass({},
    class PreeditHighlightPopup extends BoxPointer.BoxPointer {
        _init() {
            super._init(St.Side.TOP);
            this._dummyCursor = new Clutter.Actor({opacity: 0});
            Main.layoutManager.uiGroup.add_child(this._dummyCursor);
            Main.layoutManager.addTopChrome(this);

            const box = new St.BoxLayout({
                style_class: 'candidate-popup-content preedit-highlight-popup-content',
                vertical: false,
            });
            this.bin.set_child(box);

            this._beforeTargetSegment = new St.Label({
                style_class: 'preedit-highlight-popup-non-target-text',
                visible: true,
            });
            this._targetSegment = new St.Label({
                style_class: 'preedit-highlight-popup-target-text',
                visible: true,
            });
            this._afterTargetSegment = new St.Label({
                style_class: 'preedit-highlight-popup-non-target-text',
                visible: true,
            });
            box.add_child(this._beforeTargetSegment);
            box.add_child(this._targetSegment);
            box.add_child(this._afterTargetSegment);

            this._ibusManager = getIBusManager();
            this._inputContext = null;

            this._onFocusWindowID = global.display.connect(
                'notify::focus-window', this._onFocusWindow.bind(this)
            );

            this._onCursorLocationChanged = Main.inputMethod.connect('cursor-location-changed', (_im, rect) => {
                this._setDummyCursorGeometry(rect.get_x(), rect.get_y(), rect.get_width(), rect.get_height());
            });

            this._visible = false;
            this._lastCursorPos = 0;

            this._clearLabels();
            this._updateVisibility();
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
            this.setPosition(this._dummyCursor, 0);
            this._updateVisibility();
        }

        _connectInputContext(inputContext) {
            if (!inputContext)
                return;


            this._updatePreeditTextWithModeID = inputContext.connect('update-preedit-text-with-mode', (_con, text, pos, _visible, _mode) => {
                this._setPreeditText(text, pos);
            });

            this._commitTextID = inputContext.connect('commit-text', (_con, _text) => {
                this._visible = false;
                this._clearLabels();
                this._updateVisibility();
            });
        }

        _setPreeditText(ibusText, pos) {
            let text = ibusText.get_text();
            let attrs = ibusText.get_attributes();
            let attr;
            let visible = false;

            for (let i = 0; (attr = attrs.get(i)); ++i) {
                if (attr.get_attr_type() === IBus.AttrType.BACKGROUND) {
                    visible = true;
                    let start = attr.get_start_index();
                    let end = attr.get_end_index();
                    this._beforeTargetSegment.text = text.slice(0, start);
                    this._targetSegment.text       = text.slice(start, end);
                    this._afterTargetSegment.text  = text.slice(end);
                    break;
                }
            }

            this._visible = visible;
            if (!visible)
                this._clearLabels();


            // 変換候補選択後に別の文節に移動したときは必ずポップアップを表示する
            let moved = this._lastCursorPos !== pos;
            this._lastCursorPos = pos;
            this._updateVisibility(moved);
        }

        _updateVisibility(ignoreCandidatePopup = false) {
            let isVisible = this._visible && (!this._ibusManager._candidatePopup.visible || ignoreCandidatePopup);

            if (isVisible) {
                this.setPosition(this._dummyCursor, 0);
                this.open(BoxPointer.PopupAnimation.NONE);
                this.get_parent().set_child_above_sibling(this, null);
            } else {
                this.close(BoxPointer.PopupAnimation.NONE);
            }
        }

        _clearLabels() {
            this._beforeTargetSegment.text = '';
            this._targetSegment.text = '';
            this._afterTargetSegment.text = '';
        }

        destroy() {
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
        this._preeditHighlightPopup = new PreeditHighlightPopup();
    }

    disable() {
        this._preeditHighlightPopup.destroy();
        delete this._preeditHighlightPopup;
    }
}

