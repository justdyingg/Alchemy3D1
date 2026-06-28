// assets/scripts/resource/LinearStackLayout.ts
import { _decorator, Node, Vec3 } from 'cc';
import { LayoutBase } from './LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('LinearStackLayout')
export class LinearStackLayout extends LayoutBase {
    @property({ tooltip: '每层高度' })
    blockHeight: number = 0.3;

    @property({ tooltip: '启用显示上限' })
    enableVisibleCap: boolean = false;

    @property({ tooltip: '最大显示层数' })
    maxVisibleLayers: number = 5;

    @property({ tooltip: '每个方块代表几个单位' })
    unitsPerBlock: number = 1;

    private _blocks: Node[] = [];

    public reset() {
        this._blocks.forEach(b => b.destroy());
        this._blocks = [];
    }

    public getNextPosition(): Vec3 {
        const pos = this.layoutRoot!.getWorldPosition().clone();
        pos.y += this._blocks.length * this.blockHeight + this.blockHeight * 0.5;
        return pos;
    }

    public spawnBlock(): Node | null {
        const block = super.spawnBlock();
        if (!block) return null;
        block.setWorldPosition(this.getNextPosition());
        this._blocks.push(block);

        if (this.enableVisibleCap && this.maxVisibleLayers > 0 && this._blocks.length > this.maxVisibleLayers) {
            const old = this._blocks.shift();
            if (old) old.destroy();
            this.rearrange();
        }
        return block;
    }

    // 移除最底层方块（用于炼金台吸取）
    public removeBlock(): Node | null {
        if (this._blocks.length === 0) return null;
        const node = this._blocks.shift()!; // 底层移除
        this.rearrange(); // 重排消除空洞
        return node;
    }

    public hasBlocks(): boolean {
        return this._blocks.length > 0;
    }

    public getBottomBlockWorldPos(): Vec3 | null {
        return this._blocks.length > 0 ? this._blocks[0].getWorldPosition().clone() : null;
    }

    public getTopBlockWorldPos(): Vec3 | null {
        return this._blocks.length > 0 ? this._blocks[this._blocks.length - 1].getWorldPosition().clone() : null;
    }

    private rearrange(): void {
        for (let i = 0; i < this._blocks.length; i++) {
            const pos = this.layoutRoot!.getWorldPosition().clone();
            pos.y += i * this.blockHeight + this.blockHeight * 0.5;
            this._blocks[i].setWorldPosition(pos);
        }
    }
}