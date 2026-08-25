import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { ROUTES } from './constants/routes';
import { CreateRoomDraftProvider } from './hooks/useCreateRoomDraft';
import { ExpenseDraftProvider } from './hooks/useExpenseDraft';
import { CreateRoomMemberCountPage } from './pages/CreateRoomMemberCountPage';
import { CreateRoomNamePage } from './pages/CreateRoomNamePage';
import { CreateRoomNicknamesPage } from './pages/CreateRoomNicknamesPage';
import { ExpenseMethodPage } from './pages/ExpenseMethodPage';
import { JoinRoomPage } from './pages/JoinRoomPage';
import { LandingPage } from './pages/LandingPage';
import { ManualExpensePage } from './pages/ManualExpensePage';
import { MyExpenseListPage } from './pages/MyExpenseListPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { ParsedItemEditPage } from './pages/ParsedItemEditPage';
import { ParsedResultPage } from './pages/ParsedResultPage';
import { PaymentSplitPage } from './pages/PaymentSplitPage';
import { RoomCreatedPage } from './pages/RoomCreatedPage';
import { RoomHomePage } from './pages/RoomHomePage';
import { ScreenshotParsingPage } from './pages/ScreenshotParsingPage';
import { ScreenshotUploadPage } from './pages/ScreenshotUploadPage';
import { SettlementPlaceholderPage } from './pages/SettlementPlaceholderPage';
import { SplitGroupItemsPage } from './pages/SplitGroupItemsPage';
import { SplitGroupListPage } from './pages/SplitGroupListPage';
import { SplitGroupMembersPage } from './pages/SplitGroupMembersPage';
import { SplitMethodPage } from './pages/SplitMethodPage';
import { UnassignedItemsPage } from './pages/UnassignedItemsPage';

/**
 * flow #1 (방 개설 · 참여) · flow #2 (결제 내역 등록) · flow #3 (그룹 분담) 라우팅.
 *
 * 방 생성 위저드와 스크린샷 등록 흐름은 각각 화면 사이에서 입력을 공유하므로
 * Provider 로 감싼다.
 */
export function App() {
  return (
    <BrowserRouter>
      <CreateRoomDraftProvider>
        <ExpenseDraftProvider>
          <Routes>
            <Route path={ROUTES.landing} element={<LandingPage />} />

            <Route path={ROUTES.createMembers} element={<CreateRoomMemberCountPage />} />
            <Route path={ROUTES.createNicknames} element={<CreateRoomNicknamesPage />} />
            <Route path={ROUTES.createName} element={<CreateRoomNamePage />} />
            <Route path={ROUTES.createDone} element={<RoomCreatedPage />} />

            <Route path={ROUTES.joinRoom} element={<JoinRoomPage />} />
            <Route path={ROUTES.roomHome} element={<RoomHomePage />} />

            <Route path={ROUTES.expenseMethod} element={<ExpenseMethodPage />} />
            <Route path={ROUTES.screenshotUpload} element={<ScreenshotUploadPage />} />
            <Route path={ROUTES.screenshotParsing} element={<ScreenshotParsingPage />} />
            <Route path={ROUTES.parsedItemEdit} element={<ParsedItemEditPage />} />
            <Route path={ROUTES.parsedResult} element={<ParsedResultPage />} />
            <Route path={ROUTES.manualExpense} element={<ManualExpensePage />} />
            <Route path={ROUTES.myExpenses} element={<MyExpenseListPage />} />

            {/* 고정 경로가 :groupId 보다 먼저 와야 confirm 이 그룹 id 로 잡히지 않는다. */}
            <Route path={ROUTES.splitUnassigned} element={<UnassignedItemsPage />} />
            <Route path={ROUTES.splitGroupNew} element={<SplitGroupMembersPage />} />
            <Route path={ROUTES.splitGroupEdit} element={<SplitGroupMembersPage />} />
            <Route path={ROUTES.splitGroupItems} element={<SplitGroupItemsPage />} />
            <Route path={ROUTES.paymentSplit} element={<PaymentSplitPage />} />
            <Route path={ROUTES.splitGroupMethod} element={<SplitMethodPage />} />
            <Route path={ROUTES.splitGroups} element={<SplitGroupListPage />} />
            <Route path={ROUTES.settlement} element={<SettlementPlaceholderPage />} />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </ExpenseDraftProvider>
      </CreateRoomDraftProvider>
    </BrowserRouter>
  );
}
