// assets/scripts/resource/SlotStackLayout.ts
import { _decorator, Node, Vec3 } from 'cc';
import { LayoutBase } from './LayoutBase';
const { ccclass, property } = _decorator;

@ccclass('SlotStackLayout')
export class SlotStackLayout extends LayoutBase {
    @property({ type: [Node], tooltip: '按顺序排列的空节点（插槽标记），作为第一层模板' })
    slotNodes: Node[] = [];

    @property({ tooltip: '每层高度（两层之间的垂直间距）' })
    layerHeight: number = 0.3;

    @property({ tooltip: '启用显示上限' })
    enableVisibleCap: boolean = true;

    @property({ tooltip: '最大显示方块数量（仅 enableVisibleCap 为 true 时生效）' })
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

        // 显示上限处理
        if (this.enableVisibleCap && this.maxVisibleCount > 0 && this._blocks.length > this.maxVisibleCount) {
            const old = this._blocks.shift();
            if (old) old.destroy();
            // 移除旧方块后，剩余方块需要整体下移，以保持正确的层高
            this.rearrange();
        }

        return block;
    }

    /**
     * 重新排列所有方块：根据当前 blocks 的顺序重新分配位置，
     * 使显示层数始终保持一致。
     */
    private rearrange(): void {
        const slotsCount = this.slotNodes.length;
        if (slotsCount === 0) return;

        for (let i = 0; i < this._blocks.length; i++) {
            const globalIndex = i; // 重新从0开始编号，位置就会从第一层开始
            const slotIndex = globalIndex % slotsCount;
            const layerIndex = Math.floor(globalIndex / slotsCount);
            const basePos = this.slotNodes[slotIndex].getWorldPosition().clone();
            basePos.y += layerIndex * this.layerHeight;
            this._blocks[i].setWorldPosition(basePos);
        }
    }
}