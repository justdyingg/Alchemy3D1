import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('HpBarUI')
export class HpBarUI extends Component {
    @property({ type: Node, tooltip: '红色血条节点' })
    redBar: Node | null = null;

    public setPercent(percent: number) {
        if (this.redBar) {
            const scaleX = Math.max(0, Math.min(1, percent));
            this.redBar.setScale(scaleX, 1, 1);
        }
    }
}