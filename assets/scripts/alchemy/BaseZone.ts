import { _decorator, Component, Collider, ITriggerEvent } from 'cc';
import { Backpack } from '../player/Backpack';
import { BackpackView } from '../player/BackpackView';
const { ccclass, property } = _decorator;

@ccclass('BaseZone')
export abstract class BaseZone extends Component {
    protected _playerBackpack: Backpack | null = null;
    protected _playerBackpackView: BackpackView | null = null;
    protected _isPlayerInside: boolean = false;

    start() {
        const collider = this.getComponent(Collider);
        if (collider) {
            collider.on('onTriggerEnter', this.onPlayerEnter, this);
            collider.on('onTriggerExit', this.onPlayerLeave, this);
        }
    }

    private onPlayerEnter(event: ITriggerEvent) {
        const other = event.otherCollider.node;
        const backpack = other.getComponent(Backpack);
        if (backpack) {
            this._playerBackpack = backpack;
            this._playerBackpackView = other.getComponent(BackpackView);
            this._isPlayerInside = true;
            this.onEnter();
        }
    }

    private onPlayerLeave(event: ITriggerEvent) {
        const other = event.otherCollider.node;
        if (other.getComponent(Backpack)) {
            this._isPlayerInside = false;
            this._playerBackpack = null;
            this._playerBackpackView = null;
            this.onLeave();
        }
    }

    protected abstract onEnter(): void;
    protected abstract onLeave(): void;
}