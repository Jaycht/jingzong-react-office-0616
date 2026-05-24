/**
 * 低性能模式工具
 * 在低性能模式下禁用所有动画效果
 */
import { useAppStore } from "../store/appStore";

/**
 * 获取动画属性 — 低性能模式下禁用动画
 */
export function useAnimProps(
  initial?: any,
  animate?: any,
  exit?: any,
  transition?: any,
) {
  const lowPerfMode = useAppStore((s) => s.lowPerfMode);
  if (lowPerfMode) {
    return {
      initial: false,
      animate: true,
      exit,
      transition: { duration: 0 },
    };
  }
  return { initial, animate, exit, transition };
}

/**
 * ECharts 低性能配置
 */
export function getChartOpts(lowPerf?: boolean) {
  return {
    animation: !lowPerf,
    animationDuration: lowPerf ? 0 : 800,
    animationEasing: lowPerf ? undefined : "cubicOut" as const,
  };
}
