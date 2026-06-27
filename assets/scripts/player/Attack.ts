import { _decorator, Component, Node, Vec3, tween } from 'cc';
import { TargetLock } from './TargetLock';
import { Stone } from '../stone/Stone';
import { Backpack } from './Backpack';
const { ccclass, property } = _decorator;

@ccclass('Attack')
export class Attack extends Component {
    @property({ type: Node, tooltip: '木棍锚点' })
    stickAnchor: Node | null = null;
    @property({ type: Node, tooltip: '木棍模型' })
    stickNode: Node | null = null;
    @property({ tooltip: '攻击伤害' })
    attackDamage: number = 60;
    @property({ tooltip: '攻击判定范围' })
    attackRange: number = 50;
    @property({ tooltip: '攻击周期' })
    attackInterval: number = 0.5;
    @property({ tooltip: '动画时长' })
    stickAnimDuration: number = 0.4;
    @property({ tooltip: '刺出距离' })
    forwardOffset: number = 0.8;

    private _targetLock: TargetLock | null = null;
    private _backpack: Backpack | null = null;
    private _timer: number = 0;
    private _originalStickPos: Vec3 = new Vec3();

    start() {
        this._targetLock = this.getComponent(TargetLock);
        this._backpack = this.getComponent(Backpack);
        if (this.stickNode) this._originalStickPos.set(this.stickNode.position);
    }

    update(dt: number) {
        if (!this._targetLock || !this._targetLock.isLocked) return;
        this._timer += dt;
        if (this._timer >= this.attackInterval) {
            this._timer = 0;
            this.performAttack();
        }
    }

    private performAttack() {
        if (!this._targetLock?.lockedTarget || !this.stickNode || !this.stickAnchor) return;
        const stoneNode = this._targetLock.lockedTarget;
        const stone = stoneNode.getComponent(Stone);
        if (!stone) return;

        tween(this.stickNode).stop();
        this.stickNode.setPosition(this._originalStickPos);

        const forwardDir = this.stickAnchor.forward.clone().normalize();
        const targetPos = this._originalStickPos.clone().add(forwardDir.clone().multiplyScalar(this.forwardOffset));

        tween(this.stickNode)
            .to(this.stickAnimDuration / 2, { position: targetPos })
            .to(this.stickAnimDuration / 2, { position: this._originalStickPos })
            .start();

        const attackPoint = this.stickAnchor.getWorldPosition().clone();
        attackPoint.add(forwardDir.clone().multiplyScalar(this.forwardOffset * 0.5));
        const stonePos = stoneNode.getWorldPosition();
        const dist = Vec3.distance(attackPoint, stonePos);

        if (dist <= this.attackRange) {
            const caused = stone.takeDamage(this.attackDamage);
            if (caused && this._backpack) {
                const success = this._backpack.addItem('stone');
                if (success) {
                    console.log('获得 1 个原材料');
                } else {
                    console.log('背包已满');
                }
            }
        }
    }
}