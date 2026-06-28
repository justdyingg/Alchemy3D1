// assets/scripts/resource/SlotStackLayout.ts
import { _decorator, Node, Vec3 } from 'cc';
import { LayoutBase } from './LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('SlotStackLayout')
export class SlotStackLayout extends LayoutBase {
    @property({ type: [Node], tooltip: '按顺序排列的空节点（插槽标记）' })
    slotNodes: Node[] = [];

    @property({ tooltip: '每层高度' })
    layerHeight: number = 0.3;

    @property({ tooltip: '启用显示上限' })
    enableVisibleCap: boolean = false;

    @property({ tooltip: '最大显示方块数量' })
    maxVisibleCount: number = 10;

    @property({ tooltip: '每个方块代表几个单位' })
    unitsPerBlock: number = 1;

    private _blocks: Node[] = [];
    private _totalPlaced: number = 0;

    public reset() {
        this._blocks.forEach(b => b.destroy());
        this._blocks = [];
        this._totalPlaced = 0;
    }

    public getNextPosition(): Vec3 {
        if (this.slotNodes.length === 0) {
            return this.layoutRoot!.getWorldPosition().clone();
        }
        const slotIndex = this._totalPlaced % this.slotNodes.length;
        const layerIndex = Math.floor(this._totalPlaced / this.slotNodes.length);
        const basePos = this.slotNodes[slotIndex].getWorldPosition().clone();
        basePos.y += layerIndex * this.layerHeight;
        return basePos;
    }

    public spawnBlock(): Node | null {
        const block = super.spawnBlock();
        if (!block) return null;
        const pos = this.getNextPosition();
        block.setWorldPosition(pos);
        this._totalPlaced++;
        this._blocks.push(block);

        if (this.enableVisibleCap && this.maxVisibleCount > 0 && this._blocks.length > this.maxVisibleCount) {
            const old = this._blocks.shift();
            if (old) old.destroy();
            this.rearrange();
        }
        return block;
    }

    // 移除最底层方块
    public removeBlock(): Node | null {
        if (this._blocks.length === 0) return null;
        const node = this._blocks.shift()!;
        this.rearrange();
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
        const slotsCount = this.slotNodes.length;
        if (slotsCount === 0) return;
        for (let i = 0; i < this._blocks.length; i++) {
            const slotIndex = i % slotsCount;
            const layerIndex = Math.floor(i / slotsCount);
            const basePos = this.slotNodes[slotIndex].getWorldPosition().clone();
            basePos.y += layerIndex * this.layerHeight;
            this._blocks[i].setWorldPosition(basePos);
        }
    }
}