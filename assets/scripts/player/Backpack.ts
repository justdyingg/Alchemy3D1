import { _decorator, Component } from 'cc';
const { ccclass, property } = _decorator;

interface SlotData {
    type: string;
    count: number;
    capacity: number;
}

@ccclass('Backpack')
export class Backpack extends Component {
    @property({ tooltip: '每个槽位最多显示的方块数量' })
    maxVisibleBlocks: number = 50;

    private _slots: SlotData[] = [];

    /**
     * 注册新的资源类型
     */
    public registerType(type: string, capacity: number = 300): void {
        if (this.getSlotByType(type)) {
            console.warn(`Backpack: 类型 ${type} 已经注册`);
            return;
        }
        this._slots.push({ type, count: 0, capacity });
        console.log(`Backpack: 注册类型 ${type}，容量 ${capacity}`);
    }

    /**
     * 添加一个物品，满则返回 false
     */
    public addItem(type: string): boolean {
        const slot = this.getSlotByType(type);
        if (!slot) {
            console.warn(`Backpack: 类型 ${type} 未注册`);
            return false;
        }
        if (slot.count >= slot.capacity) return false;
        slot.count++;
        return true;
    }

    /**
     * 移除物品，返回实际移除数量
     */
    public removeItem(type: string, count: number): number {
        const slot = this.getSlotByType(type);
        if (!slot) return 0;
        const actual = Math.min(count, slot.count);
        slot.count -= actual;
        return actual;
    }

    /** 获取某类型的实际数量 */
    public getCount(type: string): number {
        const slot = this.getSlotByType(type);
        return slot ? slot.count : 0;
    }

    /** 获取应显示的数量（受 maxVisibleBlocks 限制） */
    public getVisibleCount(type: string): number {
        return Math.min(this.getCount(type), this.maxVisibleBlocks);
    }

    /** 获取所有已注册的类型（按注册顺序） */
    public getTypes(): string[] {
        return this._slots.map(s => s.type);
    }

    /** 检查是否完全为空 */
    public isEmpty(): boolean {
        return this._slots.every(s => s.count === 0);
    }

    private getSlotByType(type: string): SlotData | null {
        return this._slots.find(s => s.type === type) || null;
    }
}