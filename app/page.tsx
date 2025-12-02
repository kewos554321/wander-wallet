import { AppLayout } from "@/components/layout/app-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, TrendingUp, CreditCard, History } from "lucide-react"

export default function Home() {
  return (
    <AppLayout title="Wander Wallet">
      <div className="space-y-6">
        {/* 歡迎區塊 */}
        <div className="text-center py-4">
          <h2 className="text-2xl font-bold mb-2">歡迎回來！</h2>
          <p className="text-muted-foreground">管理你的旅行預算</p>
        </div>

        {/* 總覽卡片 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5" />
              總預算
            </CardTitle>
            <CardDescription>本月可用金額</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$2,450.00</div>
            <div className="text-sm text-muted-foreground mt-1">
              剩餘 $1,200.00
            </div>
          </CardContent>
        </Card>

        {/* 快速操作 */}
        <div className="grid grid-cols-2 gap-4">
          <Button className="h-20 flex-col gap-2">
            <CreditCard className="h-6 w-6" />
            <span>新增支出</span>
          </Button>
          <Button variant="outline" className="h-20 flex-col gap-2">
            <TrendingUp className="h-6 w-6" />
            <span>查看報表</span>
          </Button>
        </div>

        {/* 最近記錄 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              最近記錄
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">午餐</div>
                  <div className="text-sm text-muted-foreground">今天 12:30</div>
                </div>
                <div className="text-red-600 font-medium">-$25.00</div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">交通費</div>
                  <div className="text-sm text-muted-foreground">昨天 18:45</div>
                </div>
                <div className="text-red-600 font-medium">-$12.50</div>
              </div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">住宿費</div>
                  <div className="text-sm text-muted-foreground">昨天 14:20</div>
                </div>
                <div className="text-red-600 font-medium">-$150.00</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
