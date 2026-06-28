// assets/scripts/alchemy/WeaponUpgradeEffect.ts
import { _decorator, Component, director } from 'cc';
import { Attack } from '../player/Attack';

const { ccclass, property } = _decorator;

@ccclass('WeaponUpgradeEffect')
export class WeaponUpgradeEffect extends Component {
    @property({ tooltip: '升级后的攻击力' })
    upgradedDamage: number = 100;

    public onCoinConsumed(): void {
        // 找到玩家，修改攻击力
        const scene = director.getScene();
        if (!scene) return;

        const player = scene.getChildByName('Player');
        if (!player) {
            console.warn('未找到玩家');
            return;
        }
        const attack = player.getComponent(Attack);
        if (attack) {
            attack.attackDamage = this.upgradedDamage;
            console.log(`武器伤害已提升至 ${this.upgradedDamage}`);
        }
    }
}