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
    private _unitCount: number = 0;

    public reset() {
        this._blocks.forEach(b => b.destroy());
        this._blocks = [];
        this._unitCount = 0;
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

    public removeBlock(): Node | null {
        if (this._blocks.length === 0) return null;
        const node = this._blocks.shift()!;
        this._unitCount = Math.max(0, this._unitCount - this.unitsPerBlock); // 移除一个视觉方块对应减少 unitsPerBlock 单位
        this.syncBlocks();
        return node;
    }

    public hasBlocks(): boolean {
        return this._blocks.length > 0;
    }

    public getBlockCount(): number {
        return this._blocks.length;
    }

    public getBottomBlockWorldPos(): Vec3 | null {
        return this._blocks.length > 0 ? this._blocks[0].getWorldPosition().clone() : null;
    }

    public getTopBlockWorldPos(): Vec3 | null {
        return this._blocks.length > 0 ? this._blocks[this._blocks.length - 1].getWorldPosition().clone() : null;
    }

    // 单位相关实现
    public addUnits(count: number): void {
        this._unitCount += count;
        this.syncBlocks();
    }

    public removeUnits(count: number): number {
        const actual = Math.min(count, this._unitCount);
        this._unitCount -= actual;
        this.syncBlocks();
        return actual;
    }

    private syncBlocks(): void {
        const expected = Math.ceil(this._unitCount / this.unitsPerBlock);
        // 如果期望方块数多于当前，则创建
        while (this._blocks.length < expected) {
            const block = this.spawnBlock(); // 内部会 push 并可能处理显示上限
        }
        // 如果期望方块数少于当前，则移除多余的（从顶层移除）
        while (this._blocks.length > expected) {
            const block = this._blocks.pop();
            if (block) block.destroy();
        }
        // 如果启用了显示上限，可能会因为创建方块时触发上限移除，需要再次同步
        // 但 spawnBlock 已经处理了上限移除，这里只需确保最终方块数不超过 expected
        // 必要时再调整一次
        if (this._blocks.length > expected) {
            while (this._blocks.length > expected) {
                const block = this._blocks.pop();
                if (block) block.destroy();
            }
        }
        this.rearrange();
    }

    private rearrange(): void {
        for (let i = 0; i < this._blocks.length; i++) {
            const pos = this.layoutRoot!.getWorldPosition().clone();
            pos.y += i * this.blockHeight + this.blockHeight * 0.5;
            this._blocks[i].setWorldPosition(pos);
        }
    }
}