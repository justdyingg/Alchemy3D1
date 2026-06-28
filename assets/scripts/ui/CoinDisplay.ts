// assets/scripts/ui/CoinDisplay.ts
import { _decorator, Component, Label, director } from 'cc';
import { Backpack } from '../player/Backpack';
const { ccclass, property } = _decorator;

@ccclass('CoinDisplay')
export class CoinDisplay extends Component {
    @property({ type: Label, tooltip: '显示金币数量的 Label' })
    coinLabel: Label | null = null;

    private _backpack: Backpack | null = null;

    start() {
        // 尝试获取玩家背包，若玩家尚未生成则稍后再试
        this.findBackpack();
    }

    update(dt: number) {
        if (!this._backpack) {
            this.findBackpack();
            return;
        }

        const coinCount = this._backpack.getCount('coin');
        if (this.coinLabel) {
            this.coinLabel.string = `金币: ${coinCount}`;
        }
    }

    private findBackpack() {
        const scene = director.getScene();
        if (!scene) return;
        const player = scene.getChildByName('Player');
        if (player) {
            this._backpack = player.getComponent(Backpack);
        }
    }
}