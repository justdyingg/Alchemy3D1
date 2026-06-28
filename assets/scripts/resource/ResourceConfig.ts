import { _decorator, Component, Prefab } from 'cc';
import { Backpack } from '../player/Backpack';
const { ccclass, property } = _decorator;

// 单个资源定义（在编辑器中配置）
@ccclass('ResourceEntry')
export class ResourceEntry {
    @property({ tooltip: '资源类型名称（如 stone, gold）' })
    typeName: string = '';
    @property({ tooltip: '容量上限' })
    capacity: number = 300;
    @property({ type: Prefab, tooltip: '该类型对应的方块预制体' })
    blockPrefab: Prefab | null = null;
}

@ccclass('ResourceConfig')
export class ResourceConfig extends Component {
    @property({ type: [ResourceEntry], tooltip: '所有资源类型的定义' })
    entries: ResourceEntry[] = [];

    private _backpack: Backpack | null = null;

    start() {
        this._backpack = this.getComponent(Backpack);
        if (!this._backpack) {
            console.error('ResourceConfig: 未找到 Backpack 组件，请确保挂载在 Player 上');
            return;
        }

        // 遍历配置，注册所有类型到背包
        for (const entry of this.entries) {
            if (entry.typeName) {
                this._backpack.registerType(entry.typeName, entry.capacity);
                console.log(`ResourceConfig: 注册类型 ${entry.typeName}，容量 ${entry.capacity}`);
            }
        }
    }

    /**
     * 根据类型名获取方块预制体（供 BackpackView 使用）
     */
    public getPrefab(typeName: string): Prefab | null {
        const entry = this.entries.find(e => e.typeName === typeName);
        return entry ? entry.blockPrefab : null;
    }

    /**
     * 获取所有已配置的类型名
     */
    public getTypes(): string[] {
        return this.entries.map(e => e.typeName);
    }
}