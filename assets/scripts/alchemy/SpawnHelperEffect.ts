// assets/scripts/alchemy/SpawnHelperEffect.ts
import { _decorator, Component, Node, Prefab, instantiate, director } from 'cc';
import { LayoutBase } from '../resource/LayoutBase';
import { Attack } from '../player/Attack'; // 导入 Attack 类型

const { ccclass, property } = _decorator;

@ccclass('SpawnHelperEffect')
export class SpawnHelperEffect extends Component {
    @property({ type: Prefab, tooltip: '帮手预制体' })
    helperPrefab: Prefab | null = null;

    @property({ type: Node, tooltip: '帮手生成点（世界坐标）' })
    spawnPoint: Node | null = null;

    @property({ type: LayoutBase, tooltip: '区域 E 的布局组件（用于产出资源）' })
    outputLayout: LayoutBase | null = null;

    @property({ tooltip: '最大帮手数量' })
    maxHelpers: number = 3;

    public onCoinConsumed(): void {
        if (!this.helperPrefab || !this.spawnPoint) {
            console.warn('SpawnHelperEffect: 未设置帮手预制体或生成点');
            return;
        }

        // 检查当前帮手数量
        const scene = director.getScene();
        if (!scene) return;
        const existingHelpers = scene.getComponentsInChildren('HelperMovement');
        if (existingHelpers.length >= this.maxHelpers) {
            console.log('帮手数量已达上限');
            return;
        }

        // 生成帮手
        const helperNode = instantiate(this.helperPrefab);
        helperNode.setParent(scene);
        helperNode.setWorldPosition(this.spawnPoint.getWorldPosition());

        // 设置产出布局
        if (this.outputLayout) {
            const attack = helperNode.getComponent(Attack);
            if (attack) {
                attack.outputLayout = this.outputLayout;
            }
        }

        console.log('帮手已生成，当前数量:', existingHelpers.length + 1);
    }
}